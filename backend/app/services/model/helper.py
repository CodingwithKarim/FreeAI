import re
from typing import Any, Dict, List, Union
from huggingface_hub import ModelInfo
from transformers import BitsAndBytesConfig
import torch

from app.services.cache.cache_service import add_entry_to_cache, get_context_messages
from app.utils.types.model_types import RunInferenceRequest
from app.utils.types.cache_types import ContextMessage
from app.db.messages import persist_user_and_assistant_message
from app.utils.constants import ASSISTANT, DEFAULT_SYSTEM_PROMPT, SYSTEM, USER

# Apple GPU usuage
HAS_MPS  = getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()

# NVIDIA CUDA usage
HAS_CUDA = torch.cuda.is_available()

# AMD ROCM/HIP usage
# Apparently NVIDIA CUDA & AMD ROC both qualify for cuda?
IS_ROCM  = HAS_CUDA and (torch.version.hip is not None)

def _is_quantizable(model_info) -> bool:
    tags = [t.lower() for t in model_info.tags]

    # If it's already quantized or bitsandbytes used, it's definitely quantizable
    if any(q in tags for q in ["4-bit", "8-bit", "bitsandbytes"]) and model_info.library_name == "transformers" and model_info.pipeline_tag == "text-generation":
        return True

    return False

def _is_uncensored(model_info) -> bool:
    tags = [t.lower() for t in getattr(model_info, "tags", [])]
    return (
        "uncensored" in tags
        and getattr(model_info, "library_name", "") == "transformers"
        and getattr(model_info, "pipeline_tag", "") == "text-generation"
    )
    
def _model_weights_size(info: ModelInfo) -> int:
    return sum(f.size or 0 for f in info.siblings
        if f.rfilename.endswith((".bin", ".safetensors")))
    
def _get_quant_config(precision: str):
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

def _build_plain_prompt(messages):
    # If messages is already a string, return it directly
    if isinstance(messages, str):
        return messages   
    
    # Create a list to hold formatted conversation lines
    prompt_lines: List[str] = []
    
    # Iterate through the messages, format them, and add to the prompt lines list
    for message in messages:
        role = message["role"].capitalize() # “System”, “User”, “Assistant”
        prompt_lines.append(f"{role}: {message['content']}")
        
    # Add the assistant's response line at the end to indicate where the model should respond
    # There is a decent amount of wishful thinking here, but it helps to keep the format consistent
    prompt_lines.append("Assistant:")
    
    # Join all the lines with newlines to create and return the final prompt string
    return "\n".join(prompt_lines)

def _cleanup_plain_text_response(reply: str, mode: str) -> str:
    if mode not in ("conversation", "qa"):
        return reply
    
    match = re.match(
        r'^(?:(?:User:|Assistant:)\s*)?(.*?)(?=User:|Assistant:|$)',
        reply,
        re.DOTALL
    )
    return match.group(1).strip() if match else reply.strip()


def _prepare_pipeline_input(request: RunInferenceRequest, mode: str) -> Union[List[ContextMessage], str]: # List of ContextMessage or str 
    if mode == "conversation":
        # Get chat history and build conversation
        chat_history = get_context_messages(
            request.session_id, 
            request.model_id, 
            request.share_context
        )
        
        # Add system prompt to the beginning of the chat history along with the user message
        pipeline_input = (
            [ContextMessage(role=SYSTEM, content=DEFAULT_SYSTEM_PROMPT).to_dict()]
            + chat_history
            + [ContextMessage(role=USER, content=request.prompt).to_dict()]
        )
        
        # Return the full conversation history as input to the model
        return pipeline_input
        
    elif mode == "qa":
        # For QA mode, we only pass in system prompt and user message
        return [
            ContextMessage(role=USER, content=DEFAULT_SYSTEM_PROMPT).to_dict(),
            ContextMessage(role=USER, content=request.prompt).to_dict()
        ]
    else:
        # In generate mode, we just return the plain prompt string so model can complete it
        return request.prompt
    
def _update_cache_and_database(request: RunInferenceRequest, inference_output: str) -> None:
    # Cache & DB persistence is only neded in Conversation Mode
    if request.mode != "conversation":
        return
    
    # Cache the user message
    add_entry_to_cache(
        request.session_id, 
        request.model_id, 
        request.name, 
        USER, 
        request.prompt
    )
    
    # Cache the assistant message
    add_entry_to_cache(
        session_id=request.session_id,
        model_id=request.model_id,
        name=request.name,
        role=ASSISTANT,
        content=inference_output,
    )
    
    # Add user + assistant messages in database
    persist_user_and_assistant_message(request, inference_output)
    
def _get_device_config(precision: str) -> Dict[str, Any]:
    # Check for MPS for Apple Silicon GPU
    # Quantization not possible
    if HAS_MPS:
        return {
            "device_map": {"": "mps"},
            "torch_dtype": torch.float16,
        }
    
    # Radeon open compute config
    # Quantization not possible
    if IS_ROCM:
        return {
            "device_map": {"": "cuda:0"},
            "torch_dtype": torch.float16,
        }
        
    # Standard NVIDIA/CUDA config
    # Include quantization based on precision 
    if HAS_CUDA:    
        return {
            "device_map": "auto",
            "quantization_config": _get_quant_config(precision),
        }

    # CPU-only config
    return {
        "device_map": {"": "cpu"},
        "torch_dtype": torch.float32,
    }

def _remove_think_tags(inference_prompt: str) -> str:
    # This matches both <think> and </think>
    return re.sub(r"</?think>", "", inference_prompt)



        
