import uuid
from typing import List
from app.db.session import (
    insert_new_session, 
    get_all_sessions, 
    delete_session
)
from app.services.cache.cache_service import create_session_cache_entry
from app.utils.types.session_types import GetSessionsResponse

def svc_create_session(session_name: str) -> str:
    # Generate a random session ID 
    session_id = str(uuid.uuid4())
    
    # Insert new session into database
    insert_new_session(session_id, session_name)
    
    # Insert session_id entry into session cache
    create_session_cache_entry(session_id)
    
    # Return session id
    return session_id


def svc_get_all_sessions() -> List[GetSessionsResponse]:
    # Get all sessions from database
    rows = get_all_sessions()
    
    # Return list of session dictionaries with id and name keys
    return [GetSessionsResponse(id=session_id, name=session_name)
        for (session_id, session_name) in rows]


def svc_delete_session(id: str) -> None:
    # Delete session from database
    delete_session(id)