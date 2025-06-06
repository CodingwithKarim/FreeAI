import asyncio
from multiprocessing.connection import Connection
from multiprocessing import Process, Pipe
from typing import Dict, List, Optional, Tuple, Union

from fastapi.concurrency import run_in_threadpool

from app.utils.types.model_types import LoadModelRequest, ModelLoadStatus, RunInferenceRequest
from app.db.model import get_model_directory_path

from app.services.model.helper import (
    _build_plain_prompt,
    _cleanup_plain_text_response,
    _get_quant_config,
    _prepare_pipeline_input,
)
from transformers import (
    AutoConfig,
    AutoTokenizer,
    AutoModelForCausalLM,
    TextGenerationPipeline
)
from app.utils.constants import (
    CONVERSATION,
    EXIT, 
    GENERATE, 
    LOAD_MODEL_WARNING, 
    MAX_NEW_TOKENS, MODE, 
    PIPELINE_INPUT, 
    PROMPT, 
    QA, 
    READY, 
    THINK
) 

_parent_conn: Optional[Connection] = None
_current_model: Optional[str] = None
_model_proc: Optional[Process] = None
_load_statuses: Dict[str, str] = {}

async def run_local_inference(request: RunInferenceRequest) -> Union[str, dict]:
    # If requested model is not loaded in memory or parent connection is None, return error
    if request.model_id != _current_model or _parent_conn is None:
        return LOAD_MODEL_WARNING
        
    try:
        # Prepare the pipeline input based on the request mode
        pipeline_input = _prepare_pipeline_input(request, request.mode)
        
        # Create the payload to send to the model worker process
        payload = {
            PIPELINE_INPUT: pipeline_input,
            MAX_NEW_TOKENS: request.max_new_tokens,
            MODE: request.mode,
        }
        
        # Send the payload to the model worker process via the parent connection
        _parent_conn.send((PROMPT, payload))
        
        # Wait for the model worker process to send back the output response
        # Return the output response from the model worker process
        return await run_in_threadpool(lambda: _parent_conn.recv())

    except Exception as e:
        print(f"[Inference error] {request.model_id}: {e}")
        return {"model_id": request.model_id, "error":f"Failed to run inference: {e}"}
    

def _handle_inference_requests(child_conn: Connection, gen_pipe: TextGenerationPipeline, 
                              tokenizer, builtin_chat: bool) -> None:
    # This function handles incoming inference requests from the parent connection
    # It runs in a separate process and listens for inference requests
    while True:
        try:
            # Wait for a message from the parent connection
            msg = child_conn.recv()
        except (EOFError, BrokenPipeError):
            break

        # If the message is None or an exit command, break the loop
        if not msg or msg[0] == EXIT:
            break
            
        # Get the tag and payload from the message
        tag, payload = msg
        
        # Make sure the tag is "PROMPT" to process inference requests
        if tag != PROMPT:
            continue

        try:
            # Process the inference request with the provided payload
            response = _process_inference_request(payload, gen_pipe, tokenizer, builtin_chat)
            
            # Send inference response back to main process
            child_conn.send(response)
        except Exception as e:
            child_conn.send(f"Error: {str(e)}")       

            
def _process_inference_request(payload: dict, gen_pipe: TextGenerationPipeline, 
                              tokenizer, builtin_chat: bool) -> str:
    # Process inference inputs from the payload
    inputs = payload[PIPELINE_INPUT]
    max_new_tokens = payload[MAX_NEW_TOKENS]
    mode = payload.get(MODE, CONVERSATION)

    # Check for thinking template
    template = tokenizer.chat_template if builtin_chat else None
    disable_thinking = bool(template and THINK in template)

    # Route based on model capabilities and mode
    if builtin_chat and mode in (CONVERSATION, QA):
        # Handle chat models with built-in chat template
        if disable_thinking:
            # If chat template has thinking text, generate prompt text with thinking disabled
            prompt_text = tokenizer.apply_chat_template(
                inputs, tokenize=False, enable_thinking=False
            )
            
            # Generate response using the chat template without thinking text
            response = gen_pipe(
                prompt_text,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                continue_final_message=False,
            )
        else:
            # Pass in inputs directly to the pipeline to generate response
            response = gen_pipe(
                inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                continue_final_message=False,
            )
    else:
        # Handle non-chat models or generate mode
        # If input is a list, build a long prompt string or return as is
        prompt_str = _build_plain_prompt(inputs) if isinstance(inputs, list) else inputs
        
        # If the mode is "generate", use sampling to add a level of randomness
        # Text-Generation feature should be unaffected by not having a chat template
        if mode == GENERATE:
            response = gen_pipe(
                prompt_str,
                max_new_tokens=max_new_tokens,
                do_sample=True,
                continue_final_message=True,
            )
            
        # For Q&A or conversation mode with no built-in chat template use plain / non random generation (do_sample=False)
        # This is a very ticky tacky as these models don't have a built-in chat template. Some may respond better to the prompt_str
        else:
            response = gen_pipe(
                prompt_str,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                continue_final_message=False,
            )

    # Extract and clean response
    final_response = response[0]["generated_text"].strip()
    
    # If no built-in chat template is used, clean up the plain text response
    if not builtin_chat:
        final_response = _cleanup_plain_text_response(final_response, mode)

    # Return the final cleaned up model response
    return final_response

def _model_worker(local_dir: str, model_id: str, precision: str, child_conn):
    try:
        # Get model configuration based on the model ID
        config = AutoConfig.from_pretrained(model_id)
        
        # Load the model
        model = AutoModelForCausalLM.from_pretrained(
            local_dir,
            config=config,
            device_map="auto",
            quantization_config=_get_quant_config(precision),
            offload_buffers=True,
        )

        # Load the tokenizer
        tokenizer = AutoTokenizer.from_pretrained(
            local_dir,
            use_fast=True,
        )
        
        # Check if the tokenizer has a built-in chat template
        # This is used to determine if the model is a chat model with a built-in template
        builtin_chat = getattr(tokenizer, "chat_template", None) is not None

        # Create the Hugging Face Text-Generation Pipeline
        gen_pipe = TextGenerationPipeline(
            model=model,
            tokenizer=tokenizer,
            return_full_text=False,
        )

        # Send a message to the parent connection indicating the model is ready
        child_conn.send((READY,))
        
        # Handle incoming inference requests with a service 
        _handle_inference_requests(child_conn, gen_pipe, tokenizer, builtin_chat)
    
    except Exception as exception:
        try:
            child_conn.send(("ERROR", str(exception)))
            
        except:
            pass  # If sending fails, we take the L
        
    finally:
        # Cleanup connection and close the model
        child_conn.close()
    
async def start_load_model(request: LoadModelRequest) -> None:
     # Makes sure we reference the global variables defined at top of this file 
    global _parent_conn, _current_model, _model_proc, _load_statuses
    
    # Cleanup any old model that may be loaded in memory
    _cleanup_old_model()

    # Mark loading model in status dictionary
    _load_statuses[request.model_id] = "loading"

    # Lookup location of the model from database using model_id
    row: Tuple[str] | None = get_model_directory_path(request.model_id)
   
    if row is None or row[0] is None:
        _load_statuses[request.model_id] = "error"
        return
    
    # Get local directory from row
    local_dir: str = row[0]

    # Using pipe, create a connection pipe for the model worker process
    parent_conn, child_conn = Pipe()
    
    # Create a new process to load model into memory (needs full resources)
    p = Process(
        target=_model_worker,
        args=(local_dir, request.model_id, request.precision, child_conn),
        daemon=True,
    )
    
    # Start the model worker process
    p.start()

    # Save references to parent connection and current model so inference calls can use them
    _parent_conn   = parent_conn
    _current_model = request.model_id
    _model_proc    = p
    
    async def wait_for_model_ready(model_id: str, connection: Connection) -> None:
        try:
            # Wait for a message to the parent connection from the model worker process
            msg = await run_in_threadpool(lambda: connection.recv())
            
            # If the message is "READY", update the load status or set to "error"
            _load_statuses[model_id] = "ready" if msg == (READY,) else "error"
        except Exception:
            _load_statuses[model_id] = "error"
    
    # Schedule an async task to wait for model to be ready
    # This will update the load status once the model is ready or if an error occurs
    asyncio.create_task(
        wait_for_model_ready(request.model_id, parent_conn)
    )
    
def get_load_statuses() -> List[ModelLoadStatus]:
    # Return a list of the current load statuses for models
    return [
        ModelLoadStatus(id=model_id, status=model_status)
        
        for model_id, model_status in _load_statuses.items()
    ]
    
def _cleanup_old_model() -> None:
    global _parent_conn, _current_model, _model_proc

    # If there is a existing model process running, try to send an exit command
    if _model_proc is not None and _model_proc.is_alive():
        try:
            # Send an exit command to the child / model worker process
            if _parent_conn is not None:
                _parent_conn.send((EXIT, None))

        except Exception:
            pass
        
        # Wait for the model worker process to finish
        _model_proc.join()

    # Clear out old references so inference fails until a new model is loaded
    _parent_conn = None
    _current_model = None
    _model_proc = None

