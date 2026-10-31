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

- Passages panel: every question calls `/documents/search` alongside `/documents/chat` and lists the returned chunks in rank order. The API returns order, not scores, so the panel shows rank only. The top 3 are marked as sent to the model, because `/documents/chat` answers from exactly those.
- Citations: `[n]` in an answer is passage n. Clicking it opens that passage, and each cited sentence is highlighted.
- Two modes: Answer (search and chat) and Passages only (search, no model call).
- Asking about one document: `/documents/search` ignores `document_id`, so a scoped search fetches 40 results and filters them on the client, keeping the backend's order.
- Document states: processing (the list polls until it changes), ready, and failed with a reason. A file with no extractable text fails.
- Chat history and per-document usage counts are kept in `localStorage` per account (`chat_history_<userId>`, `doc_stats_<id>`). The API stores neither.

Design tokens (colours, fonts, radius, shadow, motion) live in `frontend/tailwind.config.js`, which replaces Tailwind's palette. Motion is CSS-only and respects `prefers-reduced-motion`.

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
  - Uploads are stored under a generated key `<user_id>/<uuid><ext>`, in the S3 bucket named by `S3_BUCKET`, or the local `uploads/` folder (`UPLOAD_DIR`) when it is unset. The client's filename is kept only in the database, for display.
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

## Environment Setup Guide

### 1. Two Separate Environment Files

This project uses **two different env files** because the frontend and backend are independent applications.

#### Frontend Environment – `frontend/.env`

Used only by the React app to know **where the FastAPI backend is located**.

**Local development**

```
VITE_API_URL=http://localhost:8000
```

**Production deployment**

```
VITE_API_URL=https://d2lsz7byx8f9wk.cloudfront.net
```

> Do not place secrets such as OpenAI keys in this file. It is exposed to the browser.

---

#### Backend Environment – `.env` in project root

Used by FastAPI to connect to infrastructure.

```
DATABASE_URL=postgresql://user:password@host:5432/dbname
OPENAI_API_KEY=sk-xxxxxxxx
JWT_SECRET_KEY=   # openssl rand -hex 32; the API refuses to start without it
```

> This file must never be committed to Git. Add it to `.gitignore`.

---

### 2. Enable pgvector in Neon PostgreSQL

Run this once in your Neon database SQL editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify installation:

```sql
\dx
SELECT '[1,2,3]'::vector;
```

---

### 3. Python Virtual Environment Setup

From project root:

```bash
& "C:\Users\gupta\AppData\Local\Programs\Python\Python314\python.exe" -m venv venv
```

Activate:

```bash
# Windows PowerShell
.\venv\Scripts\Activate.ps1

# Mac / Linux
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run backend:

```bash
uvicorn app.main:app --reload
```

---

### 4. Frontend Startup

```bash
cd frontend
npm install
npm run dev
```

---

### Note

* **frontend/.env** → tells the browser where the API lives
* **backend .env** → tells FastAPI how to reach Postgres and OpenAI
* pgvector must be enabled once in the database
* always run inside a Python virtual environment

## Tests

The tests run against a real Postgres with pgvector and mock every OpenAI call.

```bash
docker run -d --name docintel-testdb -e POSTGRES_USER=test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=test -p 55432:5432 pgvector/pgvector:pg16
pip install -r requirements-dev.txt
pytest -q
```

`TEST_DATABASE_URL` overrides the default `postgresql://test:test@localhost:55432/test`. The tests never read `.env`'s database.

What they pin down:

- a token signed with any key but the server's, including the old hardcoded `"KEY"`, gets 401
- user B can't list, search, chat over, check the status of, or delete user A's document
- an upload named `../evil.txt` is stored inside the upload store, and two uploads with the same name keep separate files
- the S3 backend uploads, reads back for processing, and deletes (against `moto`)

CI (`.github/workflows/ci.yml`) runs them on every push and pull request to `main`.

## Deployment (AWS, ap-southeast-2)

The account is on AWS's project-based setup, which only allows the project's selected region, Sydney.

```
Vercel frontend ──HTTPS──> CloudFront ──HTTP, port 80──> EC2 t4g.micro
                                                          ├─ api container (ECR image, 2 gunicorn workers)
                                                          └─ db container (pgvector/pgvector:pg16, named volume)
                                                               │
                                     S3: uploads/ + nightly backups/ <┘   SSM: secrets   CloudWatch: logs
```

| Piece | What it does |
|---|---|
| ECR | Holds the API image, tagged with the commit SHA. Keeps the last 5. |
| EC2 t4g.micro | Runs the API and Postgres containers. 1 GB RAM plus 1 GB swap. CPU credits set to `standard`, so it can't bill for bursting. |
| Postgres container | pgvector on a named Docker volume, on a Docker network with no published port. Only the API container can reach it. |
| S3 | Private bucket. `uploads/` holds documents; `backups/` holds a nightly `pg_dump`, expired after 14 days. |
| SSM Parameter Store | `DATABASE_URL`, `JWT_SECRET_KEY`, `OPENAI_API_KEY`, `POSTGRES_PASSWORD` as SecureStrings. The container reads `/docintel/*` at start through the instance role. Nothing secret is in the image. |
| CloudFront | Gives the API HTTPS, so the Vercel frontend can call it. Caching is off and every header, `Authorization` included, is forwarded. |
| CloudWatch Logs | `/docintel/api`, streams `api` and `db`, 14-day retention. |
| IAM | The instance role reads only `/docintel/*` and this bucket's `uploads/` and `backups/`, and pulls only this ECR repo. The security group admits port 80 from CloudFront's address ranges and nothing else; there is no SSH. |

The CloudFront to EC2 hop is plain HTTP. Encrypting it needs a domain and a certificate on the instance.

### How a push reaches production

1. Push to `main`. The `test` job runs pytest against a pgvector service container.
2. If it passes, `deploy` runs on an arm64 runner. It authenticates as the `docintel-github-deploy` IAM user, whose access key is in the repo secrets `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. That user can push to the `docintel-api` ECR repo and run commands on the one instance, nothing else. GitHub OIDC would avoid a stored key, but this account type blocks IAM identity providers.
3. It builds the image, tags it with the commit SHA and pushes it to ECR.
4. It runs `/opt/docintel/deploy.sh <image>` on the instance through SSM `send-command`: pull, remove the old container, start the new one, wait for `/` to answer.
5. It fetches `/` through CloudFront and fails unless it gets a 200.

`deploy` is skipped until the repo variables `ECR_REGISTRY`, `EC2_INSTANCE_ID` and `API_URL` exist. `infra/setup.sh github` prints their values and the access key.

### Cost

On-demand prices for ap-southeast-2, from AWS's price list on 1 Nov 2026:

| Item | Rate | Per month |
|---|---|---|
| EC2 t4g.micro | US$0.0106/hour | US$7.74 |
| Elastic IP (public IPv4, in use) | US$0.005/hour | US$3.65 |
| EBS gp3, 16 GB | US$0.096/GB-month | US$1.54 |
| ECR, about 0.5 GB | US$0.10/GB-month | US$0.05 |
| S3, under 1 GB | | under US$0.05 |
| CloudFront | always-free 1 TB and 10M requests a month | US$0 |
| CloudWatch Logs | under the 5 GB free ingestion | US$0 |
| SSM standard parameters, Budgets | free | US$0 |
| **Total** | | **about US$13** |

An account on AWS's Free plan pays this out of its sign-up credits until they run out or six months pass. OpenAI usage is billed separately by OpenAI.

### Setting it up

Run these in AWS CloudShell (already signed in; the account's sign-in doesn't support `aws login`), with this repo's `infra/` folder copied there.

```bash
infra/setup.sh budget you@example.com   # US$5/month budget, emails on actual and forecast overrun
infra/setup.sh storage                  # ECR repo, S3 bucket, log group
infra/setup.sh secrets                  # generates JWT and Postgres secrets, prompts for the OpenAI key
infra/setup.sh iam                      # instance role
infra/setup.sh instance                 # security group, EC2 (bootstraps Docker + Postgres), Elastic IP
infra/setup.sh cdn                      # CloudFront distribution
infra/setup.sh github                   # deploy user + access key; prints the repo variables
```

Then push to `main` to deploy, and set the frontend's `VITE_API_URL` on Vercel to the CloudFront URL. The database starts empty.

Shell on the instance: `aws ssm start-session --target <instance-id>`. Restore a backup: `aws s3 cp s3://<bucket>/backups/<file>.dump - | docker exec -i db pg_restore -U docintel -d docintel --clean`.

### Teardown

`infra/teardown.sh` deletes everything in this order, so the bill returns to zero:

1. CloudFront distribution (disabled first, then deleted once that has deployed)
2. EC2 instance, taking its volume and the database with it; then the Elastic IP
3. Security group
4. IAM instance profile and role, deploy user and its access key
5. ECR repository and images
6. S3 bucket, with all uploads and backups (download `backups/` first if you want them)
7. SSM parameters and the CloudWatch log group
8. GitHub repo variables, which makes `deploy` skip again
9. The budget