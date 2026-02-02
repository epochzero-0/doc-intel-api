from fastapi import FastAPI, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models, schemas, auth
from dependencies import get_current_user # Add this import
from fastapi.security import OAuth2PasswordRequestForm # Add this import
import shutil
import os
from fastapi import UploadFile, File
# Use the folder path to import
from processing.embedder import chunk_text, get_embedding
from processing.parser import extract_text
from processing.search import find_relevant_chunks, generate_answer # Add this import

app = FastAPI(title="Doc Intel API")

@app.get("/")
def home():
    return {"message": "Welcome to the Doc Intel API. Go to /docs for the UI."}

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)

@app.post("/auth/register", response_model=schemas.UserOut)
def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash the password
    hashed_pwd = auth.hash_password(user_data.password)
    
    # 3. Create new user object
    new_user = models.User(email=user_data.email, password_hash=hashed_pwd)
    
    # 4. Save to Postgres
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/auth/login", response_model=schemas.Token)
# Change user_data: schemas.UserCreate to form_data: OAuth2PasswordRequestForm
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    # Use form_data.username instead of user_data.email
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    
    if not user:
        raise HTTPException(status_code=403, detail="Invalid Credentials")

    # Use form_data.password
    if not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=403, detail="Invalid Credentials")

    # Create Token
    access_token = auth.create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=schemas.UserOut)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

UPLOAD_DIR = "../uploads"

@app.post("/documents/upload", response_model=schemas.DocumentOut)
async def upload_document(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Create the file path
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{file.filename}")

    # 2. Save the physical file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # 3. Unified Extraction (PDF, DOCX, TXT)
    raw_text = extract_text(file_path)
    
    # 4. Error Handling: Stop if extraction failed or file is unsupported
    if not raw_text or raw_text.startswith("Unsupported"):
        if os.path.exists(file_path):
            os.remove(file_path) # Clean up the bad file
        raise HTTPException(
            status_code=400, 
            detail="File processing failed. Ensure it is a valid PDF, DOCX, or TXT."
        )

    # 5. Break into chunks
    chunks = chunk_text(raw_text)
    
    print(f"✅ Document Processed: {file.filename}")
    print(f"📄 Characters: {len(raw_text)}")
    print(f"✂️ Total Chunks Created: {len(chunks)}")

    # 6. Save Document Metadata
    new_doc = models.Document(
        filename=file.filename,
        user_id=current_user.id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

     # 7. Generate Embeddings and Save Chunks
    print(f"🧠 Generating embeddings for {len(chunks)} chunks...")
    
    for i, chunk_content in enumerate(chunks):
        # The real API call happens here
        vector = get_embedding(chunk_content)
        
        new_chunk = models.Chunk(
            document_id=new_doc.id,
            content=chunk_content,
            chunk_index=i,
            embedding=vector
        )
        db.add(new_chunk)
    
    db.commit()
    print(f"✅ All chunks embedded and saved to pgvector!")

    return new_doc

@app.get("/documents", response_model=list[schemas.DocumentOut])
def get_my_documents(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Only return documents belonging to the logged-in user
    return db.query(models.Document).filter(models.Document.user_id == current_user.id).all()


@app.post("/documents/search", response_model=list[schemas.SearchResult])
def search_documents(
    search_data: schemas.SearchQuery,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Turn the user's question into a vector
    query_vector = get_embedding(search_data.query)
    
    # 2. Find the most relevant chunks in the database
    # Note: Currently, this searches ALL documents. 
    # In prod, we'd filter by current_user.id
    # updated: Pass the current_user.id to the search function
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
    # 1. Find the document and verify ownership
    doc = db.query(models.Document).filter(
        models.Document.id == doc_id, 
        models.Document.user_id == current_user.id
    ).first()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # 2. Delete the physical file from the 'uploads' folder
    file_path = os.path.join(UPLOAD_DIR, f"{current_user.id}_{doc.filename}")
    if os.path.exists(file_path):
        os.remove(file_path)

    # 3. Delete from DB (This automatically deletes all related chunks!)
    db.delete(doc)
    db.commit()

    return None

@app.post("/documents/chat")
def chat_with_docs(
    search_data: schemas.SearchQuery,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Get the vector and find chunks
    query_vector = get_embedding(search_data.query)
    chunks = find_relevant_chunks(
        db, 
        query_vector, 
        user_id=current_user.id, 
        doc_id=search_data.document_id
    )
    
    if not chunks:
        return {"answer": "I couldn't find any relevant information in your documents.", "metadata": {"sources": []}}
        
    # 2. Generate AI Answer with Citations
    answer = generate_answer(search_data.query, chunks)
    
    # 3. STRUCTURE THE METADATA
    # We use a dictionary to ensure we only list each file once
    unique_sources = {}
    for c in chunks:
        if c.document_id not in unique_sources:
            unique_sources[c.document_id] = c.document.filename

    # Format it into a nice list of objects
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