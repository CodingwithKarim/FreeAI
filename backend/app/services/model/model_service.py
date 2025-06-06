import asyncio
from pathlib import Path
import shutil
from typing import List, Tuple, Union

from fastapi import BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from huggingface_hub import (
    HfApi, 
    ModelInfo
)

from app.db.model import (
    delete_model,
    get_all_models,
    get_download_status,
    insert_pending_task,
    insert_model,
    update_downloading_task,
    update_failed_task,
    update_ready_task,
)
from app.services.model.helper import(
    _model_weights_size,
    _is_quantizable,
    _is_uncensored,
    update_cache_and_database    
) 
from app.utils.types.model_types import (
    DownloadModelRequest,
    LoadModelRequest,
    ModelData,
    ModelDownloadStatus,
    ModelLoadStatus,
    RunInferenceRequest,
    SearchModelsRequest,
    SearchModelsResults,
)
from app.services.model.model_worker import( 
    get_load_statuses, 
    run_local_inference, 
    start_load_model                                       
)
from app.utils.constants import HUGGING_FACE_MODELS_FOLDER

# Initialize the Hugging Face API client
# This will be used to interact with the Hugging Face Hub for model operations like downloading models and searching for models
huggingface_api = HfApi()

async def svc_run_local_inference(request: RunInferenceRequest) -> Union[str, dict]:
    # Run local inference using the provided request data
    inference_output = await run_local_inference(request)
    
    # Once all inference operation + cache update is done, update DB
    # We are doing this in a background task to avoid blocking request thread since client does not need to wait for this
    asyncio.create_task(
        run_in_threadpool(
            update_cache_and_database,
            request,
            inference_output
        )   
    )
    
    # Return output from running inference AI model
    return inference_output
    
async def svc_get_available_models(request: SearchModelsRequest) -> List[SearchModelsResults]:
    # Fetch models and their metadata from the Hugging Face Hub
    hugging_face_models, infos = await get_hf_models_and_infos(request)
    
    # Declare a list to hold safe model data
    safe_models: List[SearchModelsResults] = []
    
    # Iterate through the models and its metadata info
    for model, info in zip(hugging_face_models, infos):
        if isinstance(info, Exception):
            continue  # Skip models that failed to fetch metadata
        
        try:
            # Get the sum of model weights files (.bin or .safetensors) from info metadata
            total_bytes: int = _model_weights_size(info)
        
            # If no weight files found (.bin or .safetensors), skip the model
            if total_bytes == 0:
                continue
            
        except Exception as exception:
            print(f"[Model size error]: {model.modelId}: {exception}")
            continue
        
        # Add specific model data to the safe_models list
        safe_models.append(
            SearchModelsResults(
                id=model.modelId,
                likes=model.likes,
                downloads=model.downloads,
                size=total_bytes / (1024 ** 3),  # Convert to GB
                isQuantized=_is_quantizable(model),
                isUncensored=_is_uncensored(model),
                trending_score=model.trending_score,
            )
        )
        
    # Return the safe models from querying the Hugging Face Hub
    return safe_models

def svc_schedule_model_load(request: LoadModelRequest, background_task: BackgroundTasks) -> None:
    # Schedule loading of target model in a background task
    background_task.add_task(
        start_load_model, 
        request
    )
    
def svc_schedule_model_download(request: DownloadModelRequest, background_task: BackgroundTasks) -> None:
    # Schedule downloading of target model in a background task
    background_task.add_task(
        download_model,
        request
    )

def svc_get_all_models() -> List[ModelData]:
    # Get all models from the database
    rows = get_all_models()
    
    # Convert the rows into a list of ModelData objects and return
    return [
        ModelData(
            id=model_id,
            name=model_name,
            is_quantized=bool(is_quantized),
            is_uncensored=bool(is_uncensored)
        )
        for model_id, model_name, is_quantized, is_uncensored in rows
    ]
    
def svc_delete_model(model_id: str) -> None:
    # Delete model data from the database
    delete_model(model_id)

    # Locate the model directory location
    local_dir: Path = Path(HUGGING_FACE_MODELS_FOLDER) / model_id.replace("/", "_")
    
    # If the model directory exists, delete the entire directory
    if local_dir.exists():
        shutil.rmtree(local_dir)
        
def svc_get_download_statuses() -> List[ModelDownloadStatus]:
    # Get download status of all models from the database
    rows = get_download_status()

    # Convert the rows into a list of ModelDownloadStatus objects & return
    return [
        ModelDownloadStatus(
            model_id=model_id,
            status=download_status,
            progress=progress,
            local_path=local_path or None
        )
        for model_id, download_status, progress, local_path in rows
    ]
    
def svc_get_load_statuses() -> List[ModelLoadStatus]:
    # Get the load statuses of all models
    return get_load_statuses()

async def get_hf_models_and_infos(
   request: SearchModelsRequest
) -> Tuple[List[ModelInfo], List[Union[ModelInfo, Exception]]]:
    
    # Run blocking code in a separate thread pool to avoid blocking the event loop
    # Call the Hugging Face Hub API to list models and pass in search parameters
    hugging_face_models = await run_in_threadpool(
        lambda: list(huggingface_api.list_models(
        pipeline_tag="text-generation",
        library="transformers",
        search=request.query,
        sort=request.sortBy,
        limit=request.limit,
        tags=request.filters or [],
        direction=-1,
        cardData=True,
        full=True,
        ))
    )
    
     # For each model, schedule a blocking call to get model info on a thread pool
    info_tasks = [
        run_in_threadpool(
            lambda model=model: huggingface_api.model_info(model.modelId, files_metadata=True)
        )
        
        for model in hugging_face_models
    ]
    
    # Gather results from all info tasks once they are done
    infos = await asyncio.gather(*info_tasks, return_exceptions=True)
    
    # Return the list of models and a list of their metadata info
    return hugging_face_models, infos

def download_model(request: DownloadModelRequest):
    try:
        # Insert/Mark pending download task into the database
        insert_pending_task(request.model_id)

        # Insert/Mark download task into the database
        update_downloading_task(request.model_id)

        # Download the model from Hugging Face Hub
        # Hugging Face models are stored in the hugging_face_models folder in backend root directory
        local_dir = huggingface_api.snapshot_download(
            repo_id=request.model_id,
            resume_download=True,
            local_dir=str(Path(HUGGING_FACE_MODELS_FOLDER)/request.model_id.replace("/", "_")), 
        )
        
        # Once model is downloaded, update the task status to ready
        update_ready_task(request.model_id, local_dir)
        
        # Once all tasks are complete, insert the model data into the database
        insert_model(request)
            
    except Exception as e:
        update_failed_task(request.model_id)

        print(f"[Download error] {request.model_id}: {e}")
        raise