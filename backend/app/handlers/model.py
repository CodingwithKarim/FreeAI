from fastapi import APIRouter, Query, BackgroundTasks, HTTPException
from app.services.model_service import LoadReq, RunInferenceReq, _load_statuses, get_available_models, download_model_background, SearchReq, DownloadReq, DeleteReq, get_load_statuses, get_model_statuses, start_load_model, run_local_inference, get_all_models, delete_model
from app.services.cache_service import ClearSessionType, FetchChatHistoryRequest, clear_session_cache, get_chat_messages

router = APIRouter()

@router.post("/models/search")
def get_models(request: SearchReq):
    models = get_available_models(request)
    
    return {"models": models}

@router.post("/models/download")
async def download_model_route(request: DownloadReq, bg: BackgroundTasks):
    try:
        bg.add_task(download_model_background, request)
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to schedule download: {e}")
    return {"status": "scheduled", "model_id": request.model_id}

@router.post("/models/delete")
async def delete_model_route(request: DeleteReq):
    try:
        delete_model(request.model_id)
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to delete model: {e}")
    
@router.get("/models/status")
def models_status_route():
    return {"models": get_model_statuses()}

@router.post("/models/infer/")
def run_local_inference_route(request: RunInferenceReq):
    result = run_local_inference(request)
    
    # if result.get("error"):
    #     raise HTTPException(500, detail=result["error"])
    
    return {"message": result}

@router.get("/models")
def get_models():
    models = get_all_models()
    
    return {"models": models}

@router.post("/models/load")
def load_model_route(request: LoadReq, bg: BackgroundTasks):
    try:
        bg.add_task(start_load_model, request)
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to load model: {e}")
    
    return {"status": "loading", "model_id": request.model_id}
    
@router.get("/models/load/status")
def load_status_route():
    return get_load_statuses()

@router.post("/models/clear")
def clear_chat_context_route(request: ClearSessionType):
    clear_session_cache(request)
    
    return {"message": "Success"}

@router.post("/models/history")
def get_chat_history_route(request: FetchChatHistoryRequest):
    messages = get_chat_messages(request)
    
    print(f"Message: {messages}")
    
    return {
        "messages": messages
    }