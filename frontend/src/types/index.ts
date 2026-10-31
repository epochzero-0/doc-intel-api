// Auth types
export interface LoginRequest {
  username: string // backend expects email in username field
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  email: string
}

// Document types
export interface Document {
  id: number
  filename: string
  user_id: number
  status: 'processing' | 'completed' | 'failed'
  created_at: string
}

export interface DocumentStatus {
  document_id: number
  filename: string
  status: 'processing' | 'completed' | 'failed'
}

// Chat types
export interface ChatRequest {
  query: string
  limit?: number
  document_id?: number
}

export interface ChatSource {
  document_id: number
  filename: string
}

export interface ChatMetadata {
  total_chunks_found: number
  sources: ChatSource[]
}

export interface ChatResponse {
  answer: string
  metadata: ChatMetadata
}

// Search types
export interface SearchResult {
  content: string
  document_id: number
  chunk_index: number
}

// One question and what came back for it.
// 'answer' calls /documents/search and /documents/chat; 'passages' calls /documents/search only.
export type AskMode = 'answer' | 'passages'

export interface Turn {
  id: number
  query: string
  mode: AskMode
  documentId?: number
  // In rank order. /documents/chat answers from the top 3 of these, numbered [1] to [3].
  passages: SearchResult[] | null
  answer?: string
  sources?: ChatSource[]
  status: 'working' | 'done' | 'error'
  error?: string
  // loaded from this browser's saved history, so it renders without the highlight sweep
  restored?: boolean
}
