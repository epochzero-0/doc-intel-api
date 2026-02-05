from sqlalchemy.orm import Session
from pgvector.sqlalchemy import Vector
from app import models
from app.processing.embedder import client

def find_relevant_chunks(db: Session, query_vector: list, user_id: int, doc_id: int = None, limit: int = 3):
    query = db.query(models.Chunk).join(models.Document).filter(
        models.Document.user_id == user_id,
        models.Document.status == "completed" # only search completed documents
    )
    
    # if the user provided a specific doc_id, filter by it
    if doc_id:
        query = query.filter(models.Chunk.document_id == doc_id)
        
    results = query.order_by(
        models.Chunk.embedding.cosine_distance(query_vector)
    ).limit(limit).all()
    
    return results

def generate_answer(query: str, relevant_chunks: list):
    # create a numbered list of context pieces with their source filenames
    context_parts = []
    for i, chunk in enumerate(relevant_chunks):
        #  access chunk.document.filename because of the relationship we built
        source_name = chunk.document.filename
        context_parts.append(f"--- SOURCE {i+1} (File: {source_name}) ---\n{chunk.content}")
    
    context_text = "\n\n".join(context_parts)
    
    prompt = f"""
    You are a precise Document Assistant. Answer the question using ONLY the provided context.
    
    STRICT RULES:
    1. At the end of sentences that use information from a source, cite it like [1] or [2].
    2. If the answer isn't in the context, say "I don't have enough information in your documents."
    3. List the source filenames at the very bottom under a "Sources:" heading.

    Context:
    {context_text}
    
    Question: {query}
    Answer:"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0
    )
    return response.choices[0].message.content