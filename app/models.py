from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from pgvector.sqlalchemy import Vector
from datetime import datetime
from database import Base # No dot here
from sqlalchemy.orm import relationship 
from pydantic import BaseModel

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # This links User to Documents
    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="documents")
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan")

class Chunk(Base):
    __tablename__ = "chunks"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    # 1536 dimensions for the OpenAI 'text-embedding-3-small' model
    embedding = Column(Vector(1536))

    document = relationship("Document", back_populates="chunks")

class SearchQuery(BaseModel):
    query: str
    limit: int = 3
    document_id: int = None  # Add this optional field