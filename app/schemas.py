from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional 

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    
    class Config:
        from_attributes = True

class DocumentOut(BaseModel):
    id: int
    filename: str
    user_id: int
    status: str  # This will show "processing", "completed", or "failed"
    created_at: datetime

    class Config:
        # This allows Pydantic to read data from SQLAlchemy models
        from_attributes = True

class SearchQuery(BaseModel):
    query: str
    limit: int = 3
    document_id: Optional[int] = None # Or use: document_id: int | None = None

class SearchResult(BaseModel):
    content: str
    document_id: int
    chunk_index: int