# Doc-Intel

Doc‑Intel is a production-oriented Retrieval‑Augmented Generation (RAG) platform.
This repository contains a FastAPI backend (document ingestion, embeddings, semantic search) and a React + Vite frontend (chat UI, retrieval inspector, analytics).

---

**Quick highlights (what you can do in the frontend)**

- Register / Login users (JWT)
- Upload documents (PDF / DOCX / TXT) — background processing with status polling
- Chat with uploaded documents (RAG) and see cited sources
- Inspect retrieval: preview top semantic matches before the AI answer
- Per‑document analytics stored in `localStorage` (queries, last used, success rate, favorite)

---

**Repository layout (important files)**

- `app/` — FastAPI backend
  - `main.py` — routes, background tasks, document upload
  - `processing/` — `embedder.py`, `parser.py`, `search.py`
- `frontend/` — React + Vite app
  - `src/components` — UI components (RetrievalInspector, DocumentStats, Chat, Sidebar)
  - `src/pages/Dashboard.tsx` — main app shell

---

## Run locally

Prerequisites

- Python 3.10+
- Node 18+ / npm
- PostgreSQL (with `pgvector` extension) for production-like testing

1) Backend

```bash
cd <repo-root>
python -m venv venv
# Windows PowerShell
& .\venv\Scripts\Activate.ps1
pip install -r requirements.txt

# copy .env variables (DATABASE_URL, OPENAI_API_KEY, etc.)
uvicorn app.main:app --reload
```

Swagger UI: http://127.0.0.1:8000/docs

2) Frontend

Create `.env` in `frontend/` with:

```text
VITE_API_URL=http://localhost:8000
```

Then:

```bash
cd frontend
npm install
npm run dev
```

Open the app (Vite will show the local URL). The frontend will call the backend API at `VITE_API_URL`.

---

## What the frontend provides (implemented features)

- Retrieval Inspector: every user query triggers `/documents/search` first and shows the top matches (preview snippets, heuristic relevance bars) before calling `/documents/chat` — makes RAG transparent.
- Document Intelligence Dashboard: per‑document analytics stored in `localStorage` keyed by `doc_stats_<id>` (times queried, last used, successes, favorite). These are surfaced in `DocumentStats`.
- Processing Visualizer: `ProcessingTimeline` shows ingestion stages derived from the document `status` field.
- Chat UX upgrades: conversation threads, citation rendering (e.g., turns like "... [1]") and a source drawer listing filenames.
- Search Mode UI: three UI modes (Semantic / RAG / Strict Document) — UI-only switcher (no backend changes).

Notes: all enhancements are client-side only — no backend endpoints were added or modified.

---

## Backend overview (for deeper understanding)

- API endpoints used by the frontend (do not modify)

  - `POST /auth/login` — form login (username=email, password)
  - `POST /documents/upload` — multipart upload (file). Returns document metadata and kicks off background processing.
  - `GET /documents` — list user documents.
  - `GET /documents/{id}/status` — check processing status (`processing` | `completed` | `failed`).
  - `DELETE /documents/{id}` — remove a document.
  - `POST /documents/search` — semantic search (returns matching chunks).
  - `POST /documents/chat` — RAG answer (returns `answer` and `metadata.sources`).

- Key backend concepts
  - Uploads are saved to the top-level `uploads/` folder (created by the API).
  - Document ingestion runs in a background worker; embeddings are generated and stored in Postgres `pgvector`.
  - The backend returns metadata about sources which the frontend renders into citations and the Source Drawer.

---

## Testing flows (smoke checks)

- Register a test user via Swagger UI (`/auth/register`) or via frontend.
- Login and copy the returned token (frontend does this automatically via `localStorage`).
- Upload a document (Swagger or frontend). Poll `/documents/{id}/status` until `completed`.
- Ask a question in the chat: verify the Retrieval Inspector shows pre-chat search results and the assistant response contains sources and citation badges.

---

## Developer notes

- UI/UX code lives in `frontend/src/components` — look at `RetrievalInspector.tsx`, `DocumentStats.tsx`, `ChatSection.tsx` for the new functionality.
- The app uses React Query for data fetching, TailwindCSS for styling, Framer Motion for small animations, and `localStorage` for client analytics.
- We intentionally do a client-side `search` call before the `chat` call (in `ChatContext`) to expose retrieval transparency without changing backend behavior.