import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { chatApi } from '../api/chat'
import { errorMessage } from '../api/errors'
import type { AskMode, SearchResult, Turn } from '../types'
import { ChatContext } from './chat'

const PASSAGES_SHOWN = 5
// /documents/search ignores document_id, so a scoped search over-fetches and filters here.
// Filtering keeps the backend's order, so ranks within the document stay correct.
const SCOPED_FETCH = 40

async function searchPassages(query: string, documentId?: number): Promise<SearchResult[]> {
  if (documentId === undefined) {
    return chatApi.search({ query, limit: PASSAGES_SHOWN })
  }
  const results = await chatApi.search({ query, limit: SCOPED_FETCH })
  return results.filter((r) => r.document_id === documentId).slice(0, PASSAGES_SHOWN)
}

function recordUse(documentIds: number[]) {
  try {
    for (const id of documentIds) {
      const key = `doc_stats_${id}`
      const raw = localStorage.getItem(key)
      const stat = raw ? JSON.parse(raw) : {}
      localStorage.setItem(
        key,
        JSON.stringify({ timesQueried: (stat.timesQueried ?? 0) + 1, lastUsed: new Date().toISOString() }),
      )
    }
  } catch {
    // storage can be full or blocked; usage counts are a convenience
  }
}

// The API keeps no chat history, so the thread is saved in this browser, per account.
const HISTORY_LIMIT = 50
const historyKey = (userId: number) => `chat_history_${userId}`

function loadHistory(userId: number): Turn[] {
  try {
    const raw = localStorage.getItem(historyKey(userId))
    const turns: Turn[] = raw ? JSON.parse(raw) : []
    // A question still running when the page closed never got its reply.
    return turns.map((t) =>
      t.status === 'working'
        ? { ...t, restored: true, status: 'error', error: 'The page closed before this finished.' }
        : { ...t, restored: true },
    )
  } catch {
    return []
  }
}

export function ChatProvider({ userId, children }: { userId?: number; children: ReactNode }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [mode, setMode] = useState<AskMode>('answer')
  const [documentId, setDocumentId] = useState<number | undefined>()
  const [activeTurnId, setActiveTurnId] = useState<number | null>(null)
  const [focusedRank, setFocusedRank] = useState<number | null>(null)
  const nextId = useRef(1)
  // State, not a ref: saving must wait for the render that holds the loaded thread,
  // or the first save writes the empty initial thread over the saved one.
  const [loadedFor, setLoadedFor] = useState<number | null>(null)

  useEffect(() => {
    if (userId === undefined || loadedFor === userId) return
    const saved = loadHistory(userId)
    nextId.current = saved.reduce((max, t) => Math.max(max, t.id), 0) + 1
    setTurns(saved)
    setActiveTurnId(saved.length ? saved[saved.length - 1].id : null)
    setLoadedFor(userId)
  }, [userId, loadedFor])

  useEffect(() => {
    if (userId === undefined || loadedFor !== userId) return
    try {
      localStorage.setItem(historyKey(userId), JSON.stringify(turns.slice(-HISTORY_LIMIT)))
    } catch {
      // storage full or blocked; the thread still works for this visit
    }
  }, [turns, userId, loadedFor])

  const patch = useCallback((id: number, change: Partial<Turn>) => {
    setTurns((prev) => prev.map((t) => (t.id === id ? { ...t, ...change } : t)))
  }, [])

  const run = useCallback(
    (turn: Turn) => {
      const search = () =>
        searchPassages(turn.query, turn.documentId)
          .then((passages) => patch(turn.id, { passages }))
          .catch((e) => {
            patch(turn.id, { passages: [] })
            throw e
          })

      const work =
        turn.mode === 'passages'
          ? search()
          : chatApi.chat({ query: turn.query, document_id: turn.documentId }).then(async (res) => {
              const used = res.metadata.chunks
              patch(turn.id, { answer: res.answer, sources: res.metadata.sources, ...(used && { passages: used }) })
              recordUse(res.metadata.sources.map((s) => s.document_id))
              // An API build without metadata.chunks: show search results instead; the panel can fail alone.
              if (!used) await search().catch(() => undefined)
            })

      work
        .then(() => patch(turn.id, { status: 'done' }))
        .catch((e) => {
          const message = errorMessage(e, turn.mode === 'passages' ? 'Search failed.' : 'Could not get an answer.')
          patch(turn.id, { status: 'error', error: message })
          toast.error(message)
        })
    },
    [patch],
  )

  const ask = useCallback(
    (query: string) => {
      const q = query.trim()
      if (!q) return
      const turn: Turn = { id: nextId.current++, query: q, mode, documentId, passages: null, status: 'working' }
      setTurns((prev) => [...prev, turn])
      setActiveTurnId(turn.id)
      setFocusedRank(null)
      run(turn)
    },
    [mode, documentId, run],
  )

  const retry = useCallback(
    (turnId: number) => {
      const old = turns.find((t) => t.id === turnId)
      if (!old) return
      const turn: Turn = { ...old, passages: null, answer: undefined, sources: undefined, error: undefined, status: 'working' }
      patch(turnId, turn)
      setActiveTurnId(turnId)
      run(turn)
    },
    [turns, patch, run],
  )

  const clear = useCallback(() => {
    setTurns([])
    setActiveTurnId(null)
    setFocusedRank(null)
  }, [])

  const focusPassage = useCallback((turnId: number, rank: number) => {
    setActiveTurnId(turnId)
    setFocusedRank(rank)
  }, [])

  const selectTurn = useCallback((id: number) => {
    setActiveTurnId(id)
    setFocusedRank(null)
  }, [])

  return (
    <ChatContext.Provider
      value={{
        turns,
        ask,
        retry,
        clear,
        isWorking: turns.some((t) => t.status === 'working'),
        mode,
        setMode,
        documentId,
        setDocumentId,
        activeTurnId,
        setActiveTurnId: selectTurn,
        focusedRank,
        focusPassage,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}
