from typing import List, Optional, Tuple
from app.db.init_database import get_db
from app.utils.types.model_types import DownloadModelRequest
from app.db.sql_queries import DELETE_MODEL, DELETE_TASKS, GET_ALL_MODELS, GET_DOWNLOAD_STATUS, GET_MODEL_DIRECTORY_PATH, INSERT_MODEL, INSERT_PENDING_TASK, UPDATE_DOWNLOADING_TASK, UPDATE_FAILED_TASK, UPDATE_READY_TASK

def delete_model(model_id: str) -> None:
    with get_db() as conn:
        # Delete model data from models table
        conn.execute(
            DELETE_MODEL,
            (model_id,)
        )
        
        # Delete model data from download tasks table
        conn.execute(
            DELETE_TASKS,
            (model_id,)
        )

def insert_pending_task(model_id: str) -> None:
    with get_db() as conn:
        # Insert pending download status for a model
        conn.execute(
            INSERT_PENDING_TASK,
            (model_id,),
        )

def update_downloading_task(model_id: str) -> None:
    with get_db() as conn:
        # Update to downloading status for a model
        conn.execute(
            UPDATE_DOWNLOADING_TASK,
            (model_id,),
        )

def update_ready_task(model_id: str, local_path: str) -> None:
    with get_db() as conn:
        # Update to ready status for a model
        conn.execute(
           UPDATE_READY_TASK,
            (local_path, model_id),
        )

def update_failed_task(model_id: str) -> None:
    with get_db() as conn:
        # Update to error status for a model
        conn.execute(
           UPDATE_FAILED_TASK,
            (model_id,),
        )

def insert_model(request: DownloadModelRequest) -> None:
    with get_db() as conn:
        # Insert model into database if download is successful
        conn.execute(
            INSERT_MODEL,
            (
                request.model_id,
                request.model_name,
                request.is_quantized,
                request.is_uncensored,
            ),
        )
        
def get_download_status() -> List[Tuple[str, str, int, Optional[str]]]:
    with get_db() as conn:
        # Get download statuses for all models
        rows = conn.execute(
           GET_DOWNLOAD_STATUS
        ).fetchall()
        
    return rows

def get_all_models() -> List[Tuple[str, str, bool, bool]]:
    with get_db() as conn:
        # Get all model data from database
        rows = conn.execute(
           GET_ALL_MODELS
        ).fetchall()
        
    return rows

def get_model_directory_path(model_id: str) -> Optional[Tuple[str]]:
    with get_db() as conn:
        # Get local directory path of model from database
        row = conn.execute(
            GET_MODEL_DIRECTORY_PATH,
            (model_id,)
        ).fetchone()
        
    return row 