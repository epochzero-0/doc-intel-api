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

// A chunk the model answered from. 'opening' chunks are a scoped document's first chunks, sent so
// questions about the whole document can be answered; 'match' chunks come from similarity search.
export interface UsedChunk {
  document_id: number
  chunk_index: number
  content: string
  reason: 'opening' | 'match'
}

export interface ChatMetadata {
  total_chunks_found: number
  sources: ChatSource[]
  // in citation order: [n] is chunks[n-1]. Absent from API builds before this field existed.
  chunks?: UsedChunk[]
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
// 'answer' calls /documents/chat; 'passages' calls /documents/search only.
export type AskMode = 'answer' | 'passages'

export type Passage = SearchResult & { reason?: UsedChunk['reason'] }

export interface Turn {
  id: number
  query: string
  mode: AskMode
  documentId?: number
  // Answer mode: the chunks the model answered from, in citation order.
  // Passages mode: search results in rank order.
  passages: Passage[] | null
  answer?: string
  sources?: ChatSource[]
  status: 'working' | 'done' | 'error'
  error?: string
  // loaded from this browser's saved history, so it renders without the highlight sweep
  restored?: boolean
}
