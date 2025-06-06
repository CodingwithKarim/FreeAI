from fastapi import APIRouter, HTTPException, status
from app.services.session.session_service import (
    svc_create_session,
    svc_get_all_sessions,
    svc_delete_session,
)
from app.services.cache.cache_service import (
    svc_load_session_messages
)
from app.utils.types.session_types import (
    CreateSessionRequest,
    CreateSessionResponse,
    GetSessionsResponse,
    LoadMessagesIntoCacheRequest  
)
from app.utils.types.common_types import SuccessMessageResponse 

router = APIRouter(prefix="/sessions", tags=["sessions"])

@router.post("/", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session_route(request: CreateSessionRequest):
    try:
        # Attempt to create a new session and return session ID
        session_id: str = svc_create_session(request.name)
    
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error attempting to create new session: {exception}"
        )
    
    # Return JSON response with session ID and name
    return CreateSessionResponse(id=session_id, name=request.name)

@router.get("/", response_model=list[GetSessionsResponse], status_code=status.HTTP_200_OK)
def get_sessions_route():
    try:
        # Attempt to retrieve all sessions
        return svc_get_all_sessions()
        
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error attempting to retrieve sessions: {exception}"
        )

@router.delete("/{session_id}", response_model=SuccessMessageResponse, status_code=status.HTTP_200_OK)
def delete_session_route(session_id: str):
    try:
        # Attempt to delete specified session
        svc_delete_session(session_id)
        
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error attempting to delete session: {exception}"
        )
    
    # Return success message as JSON response
    return SuccessMessageResponse(message="Session deleted successfully")

@router.post("/cache", response_model=SuccessMessageResponse, status_code=status.HTTP_200_OK)
def load_cache_route(request: LoadMessagesIntoCacheRequest):
    try:
        # Attempt to load messages for specified session into cache
        svc_load_session_messages(request.id)
        
    except Exception as exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error attempting to load session messages into cache: {exception}"
        )
    
    # Return success message as JSON response
    return SuccessMessageResponse(message="Session messages loaded into cache successfully")