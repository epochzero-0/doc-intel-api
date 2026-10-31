import { createContext } from 'react'
import type { AskMode, Turn } from '../types'

export interface ChatContextType {
  turns: Turn[]
  ask: (query: string) => void
  retry: (turnId: number) => void
  clear: () => void
  isWorking: boolean
  mode: AskMode
  setMode: (mode: AskMode) => void
  documentId: number | undefined
  setDocumentId: (id: number | undefined) => void
  // Which turn the passages panel shows, and which passage a clicked citation points at.
  activeTurnId: number | null
  setActiveTurnId: (id: number) => void
  focusedRank: number | null
  focusPassage: (turnId: number, rank: number) => void
}

export const ChatContext = createContext<ChatContextType | null>(null)

// /documents/chat always answers from this many chunks (the backend's default limit).
export const ANSWER_CHUNKS = 3
