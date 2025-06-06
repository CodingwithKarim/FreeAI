from pydantic import BaseModel

class CreateSessionRequest(BaseModel):
    name: str
    
class CreateSessionResponse(BaseModel):
    id: str
    name: str

class GetSessionsResponse(BaseModel):
    id: str
    name: str
    
class LoadMessagesIntoCacheRequest(BaseModel):
    id: str