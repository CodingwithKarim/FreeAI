from typing import List

from fastapi import APIRouter, HTTPException, status
from starlette.background import BackgroundTasks

from app.services.cache.cache_service import (
    svc_clear_session_cache,
    svc_get_chat_history,
)
from app.services.model.model_service import (
    svc_delete_model,
    svc_get_all_models,
    svc_get_available_models,
    svc_get_download_statuses,
    svc_get_load_statuses,
    svc_run_local_inference,
    svc_schedule_model_download,
    svc_schedule_model_load,
)
from app.utils.types.cache_types import (
    ClearSessionCacheRequest,
    GetChatHistoryData,
    GetChatHistoryRequest,
    GetChatHistoryResponse,
)
from app.utils.types.common_types import SuccessMessageResponse
from app.utils.types.model_types import (
    DeleteModelRequest,
    DownloadModelRequest,
    DownloadModelResponse,
    GetAllModelsResponse,
    LoadModelRequest,
    LoadModelResponse,
    ModelData,
    ModelDownloadStatus,
    ModelDownloadStatusResponse,
    ModelLoadStatus,
    RunInferenceRequest,
    RunInferenceResponse,
    SearchModelsRequest,
    SearchModelsResponse,
    SearchModelsResults,
)


router = APIRouter()

@router.post("/models/search", response_model=SearchModelsResponse, status_code=status.HTTP_200_OK)
async def search_models_route(request: SearchModelsRequest):
    try:
        # Search the HF Hub for models based on the search arguments
        models: List[SearchModelsResults] = await svc_get_available_models(request)
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching for models: {exception}"
        )
        
    # Return the list of models found {models: models}
    return SearchModelsResponse(models=models)

@router.post("/models/download", response_model=DownloadModelResponse, status_code=status.HTTP_202_ACCEPTED)
def download_model_route(request: DownloadModelRequest, background_task: BackgroundTasks):
    try:
        # Schedule the download of the model in a background task
        svc_schedule_model_download(request, background_task)
    except Exception as exception:
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail=f"Failed to schedule download: {exception}"
        )
        
    # Return JSON response indicating the download has been scheduled 
    return DownloadModelResponse(
        model_id=request.model_id,
        status="scheduled",
    )

@router.post("/models/delete", response_model=SuccessMessageResponse, status_code=status.HTTP_200_OK)
def delete_model_route(request: DeleteModelRequest):
    try:
        # Attempt to delete the model using the provided model_id
        svc_delete_model(request.model_id)
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete model: {exception}"
        )
    
    # Return JSON response indicating successful deletion
    return SuccessMessageResponse(message="Model deleted successfully")
    
@router.get("/models/status", response_model=ModelDownloadStatusResponse, status_code=status.HTTP_200_OK)
def get_models_status_route():
    try:
        # Retrieve the statuses of all models
        model_statuses: List[ModelDownloadStatus] = svc_get_download_statuses()
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve model statuses: {exception}"
        )
    
    # Return the model statuses as a JSON response
    return ModelDownloadStatusResponse(models=model_statuses)

@router.post("/models/infer/", response_model=RunInferenceResponse, status_code=status.HTTP_200_OK)
async def run_model_inference_route(request: RunInferenceRequest):
    try:
        # Run local inference using the provided request data
        # This will call the service function that handles the inference logic
        inference_response: str | dict = await svc_run_local_inference(request)
        
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run inference: {exception}"
        )
    
    # Return the inference result as a JSON response
    return RunInferenceResponse(
        message=inference_response
    )

@router.get("/models", response_model=GetAllModelsResponse, status_code=status.HTTP_200_OK)
def get_all_models_route():
    try:
        # Retrieve data for all locally stored models
        models: List[ModelData] = svc_get_all_models()
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve stored models: {exception}"
        )
    
    # Return the list of model data as a JSON response
    return GetAllModelsResponse(models=models)

@router.post("/models/load", response_model=LoadModelResponse, status_code=status.HTTP_202_ACCEPTED)
def load_model_route(request: LoadModelRequest, background_task: BackgroundTasks):
    try:
        # Schedule the loading of the target model in background task
        svc_schedule_model_load(request, background_task)
    except Exception as e:
        raise HTTPException(500, detail=f"Failed to load model: {e}")
    
    # Return a response indicating the model is being loaded
    return LoadModelResponse(
        model_id=request.model_id,
        status="loading"
    )
    
@router.get("/models/load/status", response_model=List[ModelLoadStatus], status_code=status.HTTP_200_OK)
def get_model_load_status_route():
    try:
        # Retrieve the load statuses of all models
        load_statuses: List[ModelLoadStatus] = svc_get_load_statuses()
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve model load statuses: {exception}"
        )
        
    # Return the load statuses as a JSON response
    return load_statuses

@router.post("/models/clear", response_model=SuccessMessageResponse, status_code=status.HTTP_200_OK)
def clear_chat_context_route(request: ClearSessionCacheRequest):
    try:
        # Clear the session cache
        svc_clear_session_cache(request)
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear session cache: {exception}"
        )
    
    # Return a success message indicating the cache has been cleared
    return SuccessMessageResponse(message="Session cache cleared successfully")

@router.post("/models/history", response_model=GetChatHistoryResponse, status_code=status.HTTP_200_OK)
def get_chat_history_route(request: GetChatHistoryRequest):
    try:
        # Retrieve chat history
        chat_messages: List[GetChatHistoryData] = svc_get_chat_history(request)
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve chat history: {exception}"
        )
    
    # Return the chat history as a JSON response
    return GetChatHistoryResponse(
        messages=chat_messages
    )