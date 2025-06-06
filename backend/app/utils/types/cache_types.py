from dataclasses import dataclass
from typing import List
from pydantic import BaseModel
from pydantic.dataclasses import dataclass as pydantic_dataclass

@pydantic_dataclass
class ContextMessage:
    role: str
    content: str
    
    def to_dict(self) -> dict[str, str]:
        return {"role": self.role, "content": self.content}
    
@dataclass
class SessionCacheEntry:
    model_id: str
    name: str
    message: ContextMessage
    timestamp: str
    
class SessionBaseRequest(BaseModel):
    session_id: str
    model_id: str
    share_context: bool
    
class ClearSessionCacheRequest(SessionBaseRequest):
    pass
    
class GetChatHistoryRequest(SessionBaseRequest):
    pass
    
class GetChatHistoryData(BaseModel):
    name: str
    message: ContextMessage
    timestamp: str
    
class GetChatHistoryResponse(BaseModel):
    messages: List[GetChatHistoryData]