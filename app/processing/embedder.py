import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# This looks for OPENAI_API_KEY in your .env file
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100):
    """
    Splits text into chunks with overlap so context isn't lost mid-sentence.
    """
    chunks = []
    for i in range(0, len(text), chunk_size - overlap):
        chunks.append(text[i : i + chunk_size])
    return chunks

def get_embedding(text: str):
    """
    Calls OpenAI to turn a string into a 1536-dimensional vector.
    """
    # Replace newlines which can sometimes mess with embeddings
    text = text.replace("\n", " ")
    
    response = client.embeddings.create(
        input=[text],
        model="text-embedding-3-small"
    )
    return response.data[0].embedding