from sqlalchemy.orm import Session
from pgvector.sqlalchemy import Vector
import models
from processing.embedder import client

def find_relevant_chunks(db: Session, query_vector: list, user_id: int, doc_id: int = None, limit: int = 3):
    query = db.query(models.Chunk).join(models.Document).filter(
        models.Document.user_id == user_id
    )
    
    # If the user provided a specific doc_id, filter by it!
    if doc_id:
        query = query.filter(models.Chunk.document_id == doc_id)
        
    results = query.order_by(
        models.Chunk.embedding.cosine_distance(query_vector)
    ).limit(limit).all()
    
    return results

def generate_answer(query: str, relevant_chunks: list):
    # Combine the chunk texts into one big context block
    context = "\n\n".join([c.content for c in relevant_chunks])
    
    prompt = f"""
    You are an AI Document Assistant. Use the provided context to answer the question.
    If the answer isn't in the context, say you don't know. Do not make up facts.
    
    Context:
    {context}
    
    Question: {query}
    Answer:"""

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0 # Keep it factual
    )
    return response.choices[0].message.content