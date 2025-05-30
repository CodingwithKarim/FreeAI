import uuid
from typing import List, Dict
from app.db.session import InsertNewSession, GetAllSessions, DeleteSession
from app.db.messages import GetSessionMessages
from app.services.cache_service import load_session_messages, create_session_cache

def create_session(session_name: str) -> str:
    session_id = str(uuid.uuid4())
    
    InsertNewSession(session_id, session_name)
    create_session_cache(session_id)
    
    return session_id

def get_all_sessions() -> List[Dict[str, str]]:
    rows = GetAllSessions()
    
    return [{"id": r[0], "name": r[1]} for r in rows]

def delete_session(id: str) -> None:
    DeleteSession(id) 

def load_session(session_id: str) -> None:
    rows = GetSessionMessages(session_id)
    
    load_session_messages(session_id, rows)
        
        
        
        
        
        
        
        
        



        