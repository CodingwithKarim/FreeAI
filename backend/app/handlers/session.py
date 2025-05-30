from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.services.session_service import (
    create_session as svc_create,
    get_all_sessions as svc_list,
    delete_session as svc_delete,
)

from app.services.cache_service import (
    load_session_messages as svc_load_messages,
)

router = APIRouter(prefix="/sessions", tags=["sessions"])

class SessionCreate(BaseModel):
    name: str

class SessionRead(BaseModel):
    id: str
    name: str
    
class LoadCacheReq(BaseModel):
    id: str

@router.post("/", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session_handler(req: SessionCreate):
    sid = svc_create(req.name)
    return {"id": sid, "name": req.name}

@router.get("/", response_model=list[SessionRead])
def list_sessions_handler():
    return svc_list()

@router.delete("/{session_id}", status_code=status.HTTP_200_OK)
def delete_session_handler(session_id: str):
    svc_delete(session_id)
    
    return {"message": "Session deleted successfully",}

@router.post("/cache")
def load_cache_handler(req: LoadCacheReq):
    svc_load_messages(req.id)
    
    return {"message": "Session messages loaded successfully",}