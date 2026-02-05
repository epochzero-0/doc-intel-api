from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, Base, get_db
from app import models, schemas, auth
from app.dependencies import get_current_user 
from fastapi.security import OAuth2PasswordRequestForm 
import shutil
import os
from fastapi import UploadFile, File
from app.processing.embedder import chunk_text, get_embedding
from app.processing.parser import extract_text
from app.processing.search import find_relevant_chunks, generate_answer 
from fastapi import BackgroundTasks 

app = FastAPI(title="Doc Intel API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Welcome to the Doc Intel API. Go to /docs for the UI."}

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)

@app.post("/auth/register", response_model=schemas.UserOut)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. hash the password
    hashed_pwd = auth.hash_password(user_data.password)
    
    # 3. create new user object
    new_user = models.User(email=user_data.email, password_hash=hashed_pwd)
    
    # 4. save to postgres
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
# Change user_data: schemas.UserCreate to form_data: OAuth2PasswordRequestForm
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    # use form_data.username instead of user_data.email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user:
        raise HTTPException(status_code=403, detail="Invalid Credentials")

    # use form_data.password
    if not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=403, detail="Invalid Credentials")

    # create Token
    access_token = auth.create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

from app.database import SessionLocal # import your session maker
def process_document_task(doc_id: int, file_path: str):
    # create a fresh database session for this background thread
    db = SessionLocal()
    try:
        # 3. unified extraction
        raw_text = extract_text(file_path)
        
        if not raw_text or raw_text.startswith("Unsupported"):
            if os.path.exists(file_path):
                os.remove(file_path)
            print(f"Processing failed for doc {doc_id}")
            return

        # 5. break into chunks
        chunks = chunk_text(raw_text)
        
        # 7. Generate Embeddings and Save Chunks
        print(f"Generating embeddings for {len(chunks)} chunks in background...")
        for i, chunk_content in enumerate(chunks):
            vector = get_embedding(chunk_content)
            new_chunk = models.Chunk(
                document_id=doc_id,
                content=chunk_content,
                chunk_index=i,
                embedding=vector
            )
            db.add(new_chunk)
        
        # NEW: Update the status to completed
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            doc.status = "completed"
        
        db.commit()
        print(f"Processing finished and status updated for doc {doc_id}")
        
        db.commit()
        print(f"Background processing finished for doc {doc_id}!")
        
    except Exception as e:
        # NEW: If it fails, mark it as failed so the user knows
        doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
        if doc:
            doc.status = "failed"
        db.commit()
        print(f"🔥 Error in background task: {e}")
    finally:
        db.close() # always close your session

BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # this is the /app folder
# place uploads in the project root (one level above `app`) so the existing
# top-level `uploads/` directory is used
PROJECT_ROOT = os.path.dirname(BASE_DIR)
UPLOAD_DIR = os.path.join(PROJECT_ROOT, "uploads")
# ensure the uploads directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/documents/upload", response_model=schemas.DocumentOut)
async def upload_document(
    background_tasks: BackgroundTasks, # 
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. create file path
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")

    # 2. save physical file 
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 6. save document Metadata (so we have a doc_id to work with)
    new_doc = models.Document(
        filename=file.filename,
        user_id=current_user.id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    # new: trigger the background worker
    background_tasks.add_task(process_document_task, new_doc.id, file_path)

    return new_doc

@app.get("/documents", response_model=list[schemas.DocumentOut])
def get_my_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # only return documents belonging to the logged-in user
    return db.query(models.Document).filter(models.Document.user_id == current_user.id).all()

@app.post("/documents/search", response_model=list[schemas.SearchResult])
def search_documents(
    search_data: schemas.SearchQuery,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. turn the user's question into a vector
    query_vector = get_embedding(search_data.query)
    
    # 2. find the most relevant chunks in the database
    relevant_chunks = find_relevant_chunks(
        db, 
        query_vector, 
        user_id=current_user.id, 
        limit=search_data.limit
    )
    
    return relevant_chunks

@app.delete("/documents/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(
    doc_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    # 1. find the document and verify ownership
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id, 
        models.Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 2. delete the physical file from the 'uploads' folder
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{doc.filename}")
    if os.path.exists(file_path):
        os.remove(file_path)

    # 3. delete from DB (this allso automatically deletes all related chunks)
    db.delete(doc)
    db.commit()

    return None

@app.get("/documents/{doc_id}/status")
def get_document_status(
    doc_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id, 
        models.Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "document_id": doc.id,
        "filename": doc.filename,
        "status": doc.status
    }

@app.post("/documents/chat")
def chat_with_docs(
    search_data: schemas.SearchQuery,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. get the vector and find chunks
    query_vector = get_embedding(search_data.query)
    chunks = find_relevant_chunks(
        db, 
        query_vector, 
        user_id=current_user.id, 
        doc_id=search_data.document_id
    )
    
    if not chunks:
        return {"answer": "I couldn't find any relevant information in your documents.", "metadata": {"sources": []}}
        
    # 2. generate AI Answer with Citations
    answer = generate_answer(search_data.query, chunks)
    
    # 3. STRUCTURE THE METADATA
    # using a dictionary to ensure we only list each file once
    unique_sources = {}
    for c in chunks:
        if c.document_id not in unique_sources:
            unique_sources[c.document_id] = c.document.filename

    # formatting
    source_metadata = [
        {"document_id": doc_id, "filename": fname} 
        for doc_id, fname in unique_sources.items()
    ]
    
    return {
        "answer": answer,
        "metadata": {
            "total_chunks_found": len(chunks),
            "sources": source_metadata
        }
    }