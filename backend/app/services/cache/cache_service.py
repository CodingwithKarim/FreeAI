from datetime import datetime, timezone
from typing import Dict, List
from app.db.messages import get_session_messages
from app.utils.types.cache_types import(
    ContextMessage,
    GetChatHistoryData,
    SessionCacheEntry, 
    ClearSessionCacheRequest,
    GetChatHistoryRequest
)
from app.services.cache.helper import convert_utc_to_local

# Global cache to store sessions and their respective messages
session_cache: Dict[str, List[SessionCacheEntry]] = {}

def svc_load_session_messages(session_id: str) -> None:
     # If session already exists in cache, skip loading
    if session_id in session_cache:
        return
    
    # Get all session messages from the database
    rows = get_session_messages(session_id)
    
    # Store message entrys into the session cache
    session_cache[session_id] = [
        SessionCacheEntry(
            model_id=model,
            name=name,
            message=ContextMessage(role=role, content=content),
            timestamp= convert_utc_to_local(timestamp)
        )
        for model, name, role, content, timestamp in rows
    ]
    
def svc_get_chat_history(request: GetChatHistoryRequest) -> List[GetChatHistoryData]:
    # If session_id is not present in cache, return an empty array
    if request.session_id not in session_cache:
        return []

    # Get all session messages from the cache
    chatMessages: List[SessionCacheEntry] = session_cache[request.session_id]
    
    # If share_context is True, return every message from the session
    if request.share_context:
        return [
            GetChatHistoryData(
                name=msg.name,
                message=msg.message,
                timestamp=msg.timestamp
            )
            for msg in chatMessages
        ]

    # Otherwise, return messages for the session & specific model_id
    return [
        GetChatHistoryData(
            name=msg.name,
            message=msg.message,
            timestamp=msg.timestamp
        )
        for msg in chatMessages if msg.model_id == request.model_id
    ]

def svc_clear_session_cache(request: ClearSessionCacheRequest):     
    # If session_id is not present in cache, do nothing
    if request.session_id not in session_cache:
        return
    
    # If share_context is True, remove all messages for the session
    if request.share_context:
        session_cache.pop(request.session_id, None)
        
    # Otherwise, remove messages for the specific model_id
    else:
        session_cache[request.session_id] = [
            m for m in session_cache[request.session_id] if m.model_id != request.model_id
        ]
        
def get_context_messages(session_id: str, model_id: str, share_context: bool) -> List[ContextMessage]:
    # Check if session_id is present in cache and add it if not present
    if session_id not in session_cache:
        session_cache[session_id] = []
    
    # Get all session messages from the cache
    chatMessages: List[SessionCacheEntry] = session_cache[session_id]
    
    # If share_context is True, return every message from the session
    if share_context:
        return [msg.message.to_dict() for msg in chatMessages]

    # Otherwise, return messages for the session & specific model_id
    return [msg.message.to_dict() for msg in chatMessages if msg.model_id == model_id]
    
def create_session_cache_entry(session_id: str) -> None:
    # Check if session_id is present in cache and add it if not present
    if session_id not in session_cache:
        session_cache[session_id] = []
    
def add_entry_to_cache(
    session_id: str,
    model_id: str,
    name: str,
    role: str,
    content: str,
    timestamp: str = None
) -> None:
    # Check if session_id is present in cache and add it if not present
    if session_id not in session_cache:
        session_cache[session_id] = []
    
    # Add a new entry to the session cache
    session_cache[session_id].append(
        SessionCacheEntry(
            model_id=model_id,
            name=name,
            message=ContextMessage(role=role, content=content),
            timestamp=timestamp or datetime.now(timezone.utc).isoformat()
        )
    )