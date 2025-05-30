import inspect
from multiprocessing.connection import Connection
from pathlib import Path
from multiprocessing import Process, Pipe
import re
import shutil
import textwrap
from threading import Thread
import torch
from transformers import (
    pipeline,
    AutoConfig,
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    TextGenerationPipeline
)
import torch
from huggingface_hub import HfApi
from pydantic import BaseModel
from typing import Dict, List, Optional, Union
from app.db.database import get_db
from typing import Optional, List

from app.services.cache_service import add_message_to_cache, get_context_messages

test_mock_context = [
    "User: Hi there!",
    "Assistant: Hello! How can I help you today?",
    "User: Can you explain what polymorphism is in programming?",
    "Assistant: Sure! Polymorphism is the ability of an object to take on many forms. In OOP, "
    "it means that a single interface can represent different underlying data types.",
    "User: Great—could you give me a quick code example?"
]

mock_context = [
    {"role": "system",    "content": "You are a helpful assistant."},
    {"role": "user",      "content": "Can you explain what a function is in programming?"},
    {"role": "assistant", "content": "Sure! A function is a reusable block of code that performs a specific task. It can take inputs, called parameters, and return an output."},
    {"role": "user",      "content": "Thanks! Can you show me an example?"},
]

class SearchReq(BaseModel):
    query: str = ""
    limit: int = 25
    sortBy: Optional[str] = "downloads"
    filters: Optional[List[str]] = []
    
class DownloadReq(BaseModel):
    model_id: str
    model_name: str
    is_quantized: bool = False
    is_uncensored: bool = False
    
class DeleteReq(BaseModel):
    model_id: str

class LoadReq(BaseModel):
    model_id: str
    precision: str
    
class RunInferenceReq(BaseModel):
    session_id: str
    model_id: str
    name: str
    prompt: str
    max_new_tokens: int
    mode: str
    share_context: bool

api = HfApi()

_model_proc: Optional[Process]    = None
_parent_conn: Optional[Connection] = None
_current_model: Optional[str]     = None
_load_statuses: Dict[str, str] = {}

CHATML_TEMPLATE = "{% if not add_generation_prompt is defined %}{% set add_generation_prompt = false %}{% endif %}{% for message in messages %}{{'<|im_start|>' + message['role'] + '\n' + message['content'] + '<|im_end|>' + '\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}"

def get_load_statuses() -> List[dict]:
    """
    Returns a list of {model_id, status} for every model
    that has been asked to load into memory.
    """
    return [
        {"model_id": mid, "status": stat}
        for mid, stat in _load_statuses.items()
    ]

def get_all_models():
    with get_db() as conn:
        rows = conn.execute(
            """
           SELECT model_id, model_name, is_quantized, is_uncensored FROM models
            """
        ).fetchall()
        
    return [
        {
            "id": model_id,
            "name": model_name,
            "is_quantized": bool(is_quantized),
            "is_uncensored": bool(is_uncensored),
        }
        
        for model_id, model_name, is_quantized, is_uncensored in rows
    ]
    
def delete_model(model_id: str):
    with get_db() as conn:
        conn.execute(
            "DELETE FROM models WHERE model_id=?",
            (model_id,)
        )
        conn.execute(
            "DELETE FROM download_tasks WHERE model_id=?",
            (model_id,)
        )
        conn.commit()

    local_dir = Path("hf_models") / model_id.replace("/", "_")
    
    print(f"Deleting model {model_id} from local storage: {local_dir}")
    
    if local_dir.exists():
        shutil.rmtree(local_dir)
        
def run_local_inference(request: RunInferenceReq) -> str:
    if request.model_id != _current_model or _parent_conn is None:
        print(f"[Model not loaded] {request.model_id} != {_current_model}")
        print(f"Parent conn: {_parent_conn}")
        return {
            "model_id": request.model_id,
            "error": "Model not loaded in memory.  "
                     "Call load_model() first."
        }

    try:
        mode = request.mode.lower()
        pipeline_input: Union[str, List[dict]]
        
        if mode == "conversation":
            chat_history = get_context_messages(request.session_id, request.model_id, request.share_context)
            
            system_prompt = {"role": "system", "content": "You are a helpful AI assistant."}
            
            pipeline_input = [system_prompt] + chat_history + [{"role":"user", "content": request.prompt}]
            
            add_message_to_cache(request.session_id, request.model_id, request.name, "user", request.prompt)
            
        elif mode == "qa":
            pipeline_input = [
                {"role":"system","content":"You are a helpful AI assistant."},
                {"role":"user",  "content":request.prompt}
            ]
        
        else:
            pipeline_input = request.prompt
            
            
        payload = {
            "pipeline_input": pipeline_input,
            "max_new_tokens": request.max_new_tokens,
            "mode": request.mode
        }
            
        _parent_conn.send(("PROMPT", payload))
        
        output = _parent_conn.recv()
        
        if mode == "conversation":
            add_message_to_cache(
                session_id=request.session_id,
                model_id=request.model_id,
                name=request.name,
                role="assistant",
                content=output,
            )

        
    except Exception as e:
        print(f"[IPC error] {request.model_id}: {e}")
        return {"model_id": request.model_id, "error": f"IPC error: {e!r}"}

    return output

def _model_worker(local_dir: str, model_id: str, precision: str, child_conn):
    # 1) Load & quantize the model
    config = AutoConfig.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(
        local_dir,
        config=config,
        device_map="auto",
        quantization_config=get_quant_config(precision),
        offload_buffers=True,
    )

    # 2) Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        local_dir,
        use_fast=True,
    )
    builtin_chat = getattr(tokenizer, "chat_template", None) is not None

    # 3) Create text-generation pipeline
    gen_pipe = TextGenerationPipeline(
        model=model,
        tokenizer=tokenizer,
        return_full_text=False,
    )

    # Signal ready state
    child_conn.send(("READY",))

    # 4) Service loop
    while True:
        try:
            msg = child_conn.recv()
        except (EOFError, BrokenPipeError):
            break

        if not msg or msg[0] == "EXIT":
            break
        tag, payload = msg
        if tag != "PROMPT":
            continue

        # Unpack payload
        inputs  = payload["pipeline_input"]  # List[dict] for conversation/qa, str for generate
        max_new = payload["max_new_tokens"]
        mode    = payload.get("mode", "conversation")

        # Detect if template has hidden 'think' tags
        tpl = tokenizer.chat_template if builtin_chat else None
        disable_thinking = bool(tpl and "think" in tpl)

        # 5) Route to the pipeline
        if builtin_chat and mode in ("conversation", "qa"):
            print(f"Built in Template in mode: {mode}\n")
            if disable_thinking:
                prompt_text = tokenizer.apply_chat_template(
                    inputs,
                    tokenize=False,
                    enable_thinking=False
                )
                print(f"Disabled thinking, prompt: {prompt_text}")
                
                resp = gen_pipe(
                    prompt_text,
                    max_new_tokens=max_new,
                    do_sample=False,
                    continue_final_message=False,
                )
            else:
                # Let HF pipeline do the templating
                print(f"Inputs: {inputs}")
                resp = gen_pipe(
                    inputs,
                    max_new_tokens=max_new,
                    do_sample=False,
                    continue_final_message=False,
                )
        else:
            # Non-chat or generate mode: we need a raw string prompt
            if isinstance(inputs, list):
                # build plain-text for non-chat models or chat fallback
                prompt_str = build_plain_prompt(inputs)
            else:
                prompt_str = inputs

            if mode == "generate":
                print(f"Currently in generate mode")
                # free-form completion (sampling)
                resp = gen_pipe(
                    prompt_str,
                    max_new_tokens=max_new,
                    do_sample=True,
                    continue_final_message=True,
                )
            else:
                print(f"Fallback conversation: {prompt_str}")
                # One-shot question or fallback conversation for non-chat models
                resp = gen_pipe(
                    prompt_str,
                    max_new_tokens=max_new,
                    do_sample=False,
                    continue_final_message=False,
                )

        # Extract generated text
        reply = resp[0]["generated_text"].strip()

        # Clean up plain-text fallback
        if not builtin_chat and mode in ("conversation", "qa"):
            reply = re.match(
                r'^(?:(?:User:|Assistant:)\s*)?(.*?)(?=User:|Assistant:|$)',
                reply,
                re.DOTALL
            ).group(1).strip()

        try:
            child_conn.send(reply)
        except (EOFError, BrokenPipeError):
            break

    # Cleanup
    child_conn.close()
    


def build_plain_prompt(messages):
    """
    Fallback for non-chat models: join each turn as "Role: content" lines,
    and end with "Assistant:" so the model knows to reply.
    """
    if isinstance(messages, str):
        return messages   

    lines = []
    
    for m in messages:
        role = m["role"].capitalize()  # “System”, “User”, “Assistant”
        lines.append(f"{role}: {m['content']}")
        
    lines.append("Assistant:")
    return "\n".join(lines)

def start_load_model(request: LoadReq):
    global _model_proc, _parent_conn, _current_model

    # 1) mark loading
    _load_statuses[request.model_id] = "loading"

    # 2) lookup local_dir…
    with get_db() as conn:
        row = conn.execute(
            "SELECT local_path FROM download_tasks WHERE model_id=? AND status='ready'",
            (request.model_id,),
        ).fetchone()
    if not row or not row[0]:
        _load_statuses[request.model_id] = "error"
        return
    local_dir = row[0]

    # 3) spin up the worker
    parent_conn, child_conn = Pipe()
    p = Process(
        target=_model_worker,
        args=(local_dir, request.model_id, request.precision, child_conn),
        daemon=True,
    )
    p.start()

    # 4) save references so run_local_inference can use them
    _model_proc    = p
    _parent_conn   = parent_conn
    _current_model = request.model_id
    
    def waiter():
        try:
            msg = parent_conn.recv()
            _load_statuses[request.model_id] = "ready" if msg == ("READY",) else "error"
        except Exception:
            _load_statuses[request.model_id] = "error"

    Thread(target=waiter, daemon=True).start()
    

def get_available_models(request: SearchReq):
    # Query only text-generation models compatible with Transformers
    models = api.list_models(
        pipeline_tag="text-generation",
        library="transformers",
        search=request.query,
        sort=request.sortBy,
        limit=request.limit,
        tags=request.filters or [],
        direction=-1,
        cardData=True,
    )
    
    safe_models = []
    for m in models:
        info = api.model_info(m.modelId, files_metadata=True)
        
        weight_files = [
            f for f in info.siblings
            if f.rfilename.endswith((".bin", ".safetensors"))
        ]
        
        total_bytes = sum(f.size or 0 for f in weight_files)
        
        if total_bytes == 0:
            continue
        
    
        
        safe_models.append({
            "id":              m.modelId,
            "likes":           m.likes,
            "downloads":       m.downloads,
            "size":            total_bytes / (1024 ** 3) ,
            "isQuantized":  is_quantizable(m),
            "isUncensored": is_uncensored(m),
            "trending_score": m.trending_score,
            "tags":            m.tags,
            "info":            info,
        })

    return safe_models
     

def download_model_background(request: DownloadReq):
    # mark pending…
    with get_db() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO download_tasks (model_id, status, progress) VALUES (?, ?, ?)",
            (request.model_id, "pending", 0)
        )
        conn.commit()

    try:
        # mark downloading…
        with get_db() as conn:
            conn.execute(
                "UPDATE download_tasks SET status=?, progress=? WHERE model_id=?",
                ("downloading", 0, request.model_id)
            )
            conn.commit()

        # do the download
        local_dir = api.snapshot_download(
            repo_id=request.model_id,
            resume_download=True,
            local_dir=str(Path("hf_models")/request.model_id.replace("/", "_")),
        )

        # mark ready…
        with get_db() as conn:
            conn.execute(
                "UPDATE download_tasks SET status=?, progress=?, local_path=? WHERE model_id=?",
                ("ready", 100, local_dir, request.model_id)
            )
            conn.execute(
                "INSERT OR IGNORE INTO models (model_id, model_name, is_quantized, is_uncensored) VALUES (?, ?, ?, ?)",
                (request.model_id, request.model_name, request.is_quantized, request.is_uncensored)
            )
            conn.commit()

        return local_dir

    except Exception as e:
        # record the error status
        with get_db() as conn:
            conn.execute(
                "UPDATE download_tasks SET status=?, progress=? WHERE model_id=?",
                ("error", 0, request.model_id)
            )
            conn.commit()

        print(f"[download error] {request.model_id}: {e}")
        raise  # re-raises the same exception

def get_model_statuses():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT model_id, status, progress, local_path FROM download_tasks"
        ).fetchall()

    return [
        {
            "model_id":   model_id,
            "status":     status,
            "progress":   progress,
            "local_path": local_path,
        }
        for model_id, status, progress, local_path in rows
    ]
    
def is_quantizable(model_info) -> bool:
    tags = [t.lower() for t in model_info.tags]

    # If it's already quantized or bitsandbytes used, it's definitely quantizable
    if any(q in tags for q in ["4-bit", "8-bit", "bitsandbytes"]) and model_info.library_name == "transformers" and model_info.pipeline_tag == "text-generation":
        return True

    return False

def is_uncensored(model_info) -> bool:
    tags = [t.lower() for t in getattr(model_info, "tags", [])]
    return (
        "uncensored" in tags
        and getattr(model_info, "library_name", "") == "transformers"
        and getattr(model_info, "pipeline_tag", "") == "text-generation"
    )
    
def get_quant_config(precision: str):
    if precision == "4bit":
        return BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_quant_type="nf4",
            llm_int8_enable_fp32_cpu_offload=True
        )
    if precision == "8bit":
        return BitsAndBytesConfig(
            load_in_8bit=True,
            bnb_8bit_compute_dtype=torch.float16,
            llm_int8_enable_fp32_cpu_offload=True
        )
    return None

