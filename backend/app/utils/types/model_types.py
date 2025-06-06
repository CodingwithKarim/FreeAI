from typing import List, Optional
from pydantic import BaseModel

class SearchModelsRequest(BaseModel):
    query: str = ""
    limit: int = 25
    sortBy: Optional[str] = "downloads"
    filters: Optional[List[str]] = []
    
class DownloadModelRequest(BaseModel):
    model_id: str
    model_name: str
    is_quantized: bool = False
    is_uncensored: bool = False
    
class DeleteModelRequest(BaseModel):
    model_id: str
    
class LoadModelRequest(BaseModel):
    model_id: str
    precision: str
    
class RunInferenceRequest(BaseModel):
    session_id: str
    model_id: str
    name: str
    prompt: str
    max_new_tokens: int
    mode: str
    share_context: bool
    
class RunInferenceResponse(BaseModel):
    message: str | dict
    
class SearchModelsResults(BaseModel):
    id: str
    likes: int
    downloads: int
    size: float
    isQuantized: bool
    isUncensored: bool
    trending_score: int | None
  
    
class SearchModelsResponse(BaseModel):
    models: List[SearchModelsResults]
    
class ModelDownloadStatus(BaseModel):
    model_id: str
    status: str
    progress: int
    local_path: Optional[str] = None
    
class ModelDownloadStatusResponse(BaseModel):
    models: List[ModelDownloadStatus]
    
class ModelLoadStatus(BaseModel):
    id: str
    status: str
    
class ModelData(BaseModel):
    id: str
    name: str
    is_quantized: bool
    is_uncensored: bool
    
class GetAllModelsResponse(BaseModel):
    models: List[ModelData]
    
class LoadModelBase(BaseModel):
    model_id: str
    status: str
    
class DownloadModelResponse(LoadModelBase):
    pass

class LoadModelResponse(LoadModelBase):
    pass