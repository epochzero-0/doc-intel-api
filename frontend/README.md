# Doc Intel Frontend

React + Vite frontend for the Doc Intel API. Deployed on Vercel at https://doc-intel-api.vercel.app. The root [README](../README.md) covers the backend, the API contract and deployment.

## Features

- Landing page at `/`; the app at `/app`, behind login
- JWT login and registration
- Upload PDF, DOCX or TXT; the library polls until each document is ready or failed
- Answer mode: a written answer whose `[n]` citations open the passages it was written from
- Passages only mode: search results, no model call
- Scope a question to one document or ask across all of them
- Chat history and per-document usage counts saved in `localStorage`, per account

## Tech stack

React 18, TypeScript, Vite, TailwindCSS, TanStack Query, React Router, Axios, react-hot-toast.

Design tokens (colours, fonts, radius, shadow, motion) are in `tailwind.config.js`, which replaces Tailwind's palette, so stock classes like `bg-blue-600` don't exist.

## Setup

Node 18+.

```bash
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

The app runs at http://localhost:3000.

Without `.env`, the API URL comes from `<meta name="api-url">` in `index.html`, which is the production API.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Type-check, then build to `dist/` |
| `npm run lint` | ESLint, zero warnings allowed |
| `npm run preview` | Serve the built `dist/` |

## Deploy

Vercel, with `frontend` as the root directory. Set `VITE_API_URL` to the CloudFront URL, `https://d2lsz7byx8f9wk.cloudfront.net`. `vercel.json` rewrites every path to `index.html` so client routes load directly.

## API endpoints used

| Method | Endpoint | Used for |
|--------|----------|----------|
| POST | /auth/register | Create an account |
| POST | /auth/login | Sign in (form data, returns a JWT) |
| GET | /users/me | The signed-in user |
| POST | /documents/upload | Upload a file |
| GET | /documents | The library |
| GET | /documents/{id}/status | Poll a new upload |
| DELETE | /documents/{id} | Delete a document |
| POST | /documents/chat | Answer mode |
| POST | /documents/search | Passages only mode |

## Project structure

```
src/
├── api/                  # Axios client and one module per API area
├── components/
│   ├── Chat/             # ChatSection, AnswerText (citations and highlights)
│   ├── Layout/           # Sidebar (library), AuthLayout
│   ├── Passages/         # Highlighted (query terms in a passage)
│   ├── Upload/
│   ├── ui/               # Button, Field, Logo, StatusPill, Working
│   └── RetrievalInspector.tsx   # Passages panel
├── context/              # ChatProvider: the thread, ask/retry, saved history
├── hooks/                # useAuth, useChat, useDocuments, useUpload
├── pages/                # Landing, Login, Register, Dashboard
├── types/
├── App.tsx               # Routes
└── main.tsx              # Entry point
```
