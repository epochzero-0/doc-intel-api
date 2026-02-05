# Doc Intel Frontend

A React + Vite frontend for the Doc Intel API - a RAG-powered document intelligence platform.

## Features

- 🔐 JWT Authentication (login/register)
- 📄 Document Upload (PDF, DOCX, TXT)
- ⏳ Real-time processing status with polling
- 💬 Chat with documents using RAG
- 📝 Citation rendering with source attribution
- 📱 Responsive design with Tailwind CSS

## Tech Stack

- React 18 + TypeScript
- Vite
- TailwindCSS
- React Query (TanStack Query)
- React Router
- Axios

## Prerequisites

- Node.js 18+
- Backend API running (see parent directory)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL:
```
VITE_API_URL=http://localhost:8000
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variable:
   - `VITE_API_URL` = your backend URL (e.g., `https://doc-intel-api.fly.dev`)
4. Deploy

## Deploy with Docker

```bash
docker build -t doc-intel-frontend .
docker run -p 80:80 doc-intel-frontend
```

## API Endpoints Used

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login (returns JWT) |
| GET | /users/me | Get current user |
| POST | /documents/upload | Upload document |
| GET | /documents | List all documents |
| GET | /documents/{id}/status | Get processing status |
| DELETE | /documents/{id} | Delete document |
| POST | /documents/chat | Chat with documents |
| POST | /documents/search | Search documents |

## Project Structure

```
src/
├── api/           # API client layer
├── components/    # React components
│   ├── Chat/
│   ├── Layout/
│   └── Upload/
├── context/       # React context (ChatContext)
├── hooks/         # Custom hooks
├── pages/         # Page components
├── types/         # TypeScript types
├── App.tsx        # Main app with routing
└── main.tsx       # Entry point
```
