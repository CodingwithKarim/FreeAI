from datetime import datetime, timezone
from typing import Dict, List

from pydantic import BaseModel

from app.db.database import get_db

class ClearSessionType(BaseModel):
    session_id: str
    model_id: str
    share_context: bool
    
class FetchChatHistoryRequest(BaseModel):
    session_id: str
    model_id: str
    share_context: bool

session_cache: Dict[str, List[Dict[str, str]]] = {}

def load_session_messages(session_id: str):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT
              m.model_id,
              mo.model_name,
              m.role,
              m.content,
              m.timestamp
            FROM messages AS m
            JOIN models   AS mo
              ON m.model_id = mo.model_id
            WHERE m.session_id = ?
            ORDER BY m.timestamp
            """,
            (session_id,),
        ).fetchall()

    session_cache[session_id] = [
        {
            "model_id":  model,
            "name":      name,
            "role":      role,
            "content":   content,
            "timestamp": timestamp.isoformat()
                           if hasattr(timestamp, "isoformat")
                           else str(timestamp),
        }
        for model, name, role, content, timestamp in rows
    ]
    
def create_session_cache(session_id: str):
    if session_id not in session_cache:
        session_cache[session_id] = []
    
def get_context_messages(session_id: str, model_id: str, share_context: bool) -> List[Dict[str, str]]:
    if session_id not in session_cache:
        session_cache[session_id] = []
        
    messages = session_cache[session_id]
    
    if share_context:
        return [
            {"role": m["role"], "content": m["content"]}
            for m in messages
        ]

    return [
        {"role": m["role"], "content": m["content"]}
        for m in messages if m["model_id"] == model_id
    ]
    
def add_message_to_cache(
    session_id: str,
    model_id: str,
    name: str,
    role: str,
    content: str,
    timestamp: str = None
) -> None:
    if session_id not in session_cache:
        print(f"Creating new session cache for session_id: {session_id}")
        session_cache[session_id] = []

    ts = timestamp or datetime.now(timezone.utc).isoformat()
    
    session_cache[session_id].append({
        "model_id": model_id,
        "name": name,
        "role":     role,
        "content":  content,
        "timestamp": ts
    })
    
def clear_session_cache(request: ClearSessionType):
    print(f"Clearing session cache for session_id: {request.session_id}, model_id: {request.model_id}, share_context: {request.share_context}")
    if request.session_id in session_cache:
        if request.share_context:
            print(f"Clearing all messages for session {request.session_id}")
            session_cache.pop(request.session_id, None)
        else:
            print(f"Clearing messages for model {request.model_id} in session {request.session_id}")
            session_cache[request.session_id] = [
                m for m in session_cache[request.session_id] if m["model_id"] != request.model_id
            ]
            
    print(f"Session cache after clearing: {session_cache}")
            
def get_chat_messages(request: FetchChatHistoryRequest) -> List[Dict[str, str]]:
    if request.session_id not in session_cache:
        load_session_messages(request.session_id)

    messages = session_cache[request.session_id]
    
    if request.share_context:
        return [
            {"name": m["name"], "role": m["role"], "content": m["content"], "timestamp": m["timestamp"]}
            for m in messages
        ]

    return [
        {"name": m["name"], "role": m["role"], "content": m["content"], "timestamp": m["timestamp"]}
        for m in messages if m["model_id"] == request.model_id
    ]
