# System Architecture

The following diagram illustrates the flow of data from document upload to the final AI-generated response.

```mermaid
graph TD
    subgraph Client_Layer
        User((User))
    end

    subgraph API_Layer [FastAPI Backend]
        Auth[JWT Authentication]
        Upload[Upload Endpoint]
        Chat[Chat/RAG Endpoint]
    end

    subgraph Processing_Layer [Background Worker]
        Extract[Text Extraction]
        Chunk[Recursive Chunking]
        Embed[OpenAI Embeddings]
    end

    subgraph Storage_Layer [PostgreSQL + pgvector]
        DB[(Metadata & Vectors)]
    end

    User --> Auth
    Auth --> Upload
    Upload -->|Fast Response| User
    Upload -->|Background Task| Extract
    Extract --> Chunk
    Chunk --> Embed
    Embed --> DB
    Chat -->|Vector Search| DB
    DB -->|Context| Chat
    Chat -->|Cited Answer| User