# Doc-Intel API: Production-Grade RAG Backend

**Doc-Intel API** is a high-performance, asynchronous Retrieval-Augmented Generation (RAG) system. It allows users to upload private documents (PDF, DOCX, TXT) and have "grounded" conversations with them using OpenAI's GPT-4o and Semantic Search.



## System Architecture

The system is built with a decoupled architecture to ensure scalability and data isolation.

### **Core Components**

* **API Framework:** FastAPI (Asynchronous Python)
* **Database:** PostgreSQL with **pgvector** extension for high-dimensional vector storage.
* **LLM & Embeddings:** OpenAI `gpt-4o` for synthesis and `text-embedding-3-small` for vectorization.
* **Task Management:** FastAPI `BackgroundTasks` for non-blocking document processing.
* **Security:** OAuth2 with JWT (JSON Web Tokens) for multi-tenant data isolation.


## How It Works 

### **1. The Ingestion Pipeline (Asynchronous)**

**The Need:** Processing a 50-page PDF (text extraction, chunking, and 50+ API calls for embeddings) takes significant time. If the API waits for this, the connection will time out.

**Solution:** 
* When a user uploads a file, the API immediately saves it and returns a `document_id` with a `processing` status.

* A **Background Task** is spawned to handle extraction and embedding.
* This ensures a snappy User Experience (UX) while the server works in the background.

### **2. Semantic Search vs. Keyword Search**

**The Need:** Traditional search looks for exact words. Semantic search understands intent (e.g., finding "remuneration" when searching for "salary").

**Solution:** 
* Text is converted into a 1536-dimensional vector coordinate.

* The system uses **Cosine Similarity** via `pgvector` to find text chunks that are mathematically related to the user's query.

### **3. Grounded Synthesis & Citations**

**The Need:** LLMs are prone to "hallucinations" (making things up).

**Solution:** 
* **Context Injection:** Only the top-N relevant chunks from the database are fed into the prompt.

* **Source Attribution:** The system maps chunks back to their parent files, providing in-line citations like `[1]` so users can verify facts against the source.

##  RAG Strategy & Optimization

* **Chunking Strategy:** Implemented **Recursive Character Splitting** with a chunk size of 1,000 characters and a 10% overlap. This ensures that semantic context is preserved across chunk boundaries, preventing "context clipping."
* **Embedding Model:** Utilized `text-embedding-3-small` for an optimal balance between vector dimensions and latency, stored in a **pgvector** index for sub-second retrieval.
* **Prompt Engineering:** Optimized system prompts to enforce **Strict Grounding**, instructing the model to decline answering if the context is insufficient.



## User Flow

1. **Auth:** User logs in and receives a JWT.
2. **Upload:** User uploads a document. API returns `status: processing`.
3. **Process:** Background worker extracts text, chunks it, and generates embeddings.
4. **Ready:** Once complete, the document status flips to `completed`.
5. **Chat:** User asks a question. The system:
* Vectorizes the question.
* Queries `pgvector` for the top 3 relevant chunks.
* Synthesizes a cited answer via GPT-4o.


## Key Features

1. **Multi-format Support:** PDF, DOCX, and TXT.
2. **Semantic Memory:** Persistent storage of vectors in PostgreSQL.
3. **Real-time Status:** Polling endpoint to check document readiness.
4. **Citable Answers:** AI responses linked directly to source files.
5. **Multi-tenancy:** Users only access their own uploaded knowledge base.


## 📂 Project Structure

```text
app/
├── main.py            # API Routes & Background Tasks
├── models.py          # SQLAlchemy Database Models
├── schemas.py         # Pydantic Data Validation
├── database.py        # DB Connection & Session Management
├── auth/              # JWT & Security Logic
└── processing/
    ├── embedder.py    # OpenAI Vector Logic
    ├── search.py      # Semantic Search & LLM Synthesis
    └── parser.py      # PDF/DOCX Text Extraction

```



## Getting Started

### **Prerequisites**

* Python 3.10+
* PostgreSQL with `pgvector` extension installed.

### **1. Clone & Setup Environment**

```bash
git clone https://github.com/epochzero-0/doc-intel-api.git
cd doc-intel-api
python -m venv venv
source venv/bin/activate  # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

```

### **2. Environment Variables**

Create a `.env` file in the root:

```text
DATABASE_URL=postgresql://user:password@localhost:5432/doc_intel
OPENAI_API_KEY=your_key_here
```

### **3. Database Initialization**

The system automatically initializes tables on startup via SQLAlchemy. Ensure the `pgvector` extension is enabled in your DB:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### **4. Run the Server**

```bash
uvicorn app.main:app --reload
```


## API Documentation

Once the server is running, access the interactive documentation at:

* **Swagger UI:** `http://127.0.0.1:8000/docs`
* **ReDoc:** `http://127.0.0.1:8000/redoc`



## Future Roadmap

* **Hybrid Search:** Combine BM25 keyword matching with Vector search for better technical term retrieval.
* **OCR Integration:** Add `pytesseract` to support scanned PDF images.
* **Conversation Memory:** Implement Redis-based session storage to allow the AI to remember previous turns in a chat.
