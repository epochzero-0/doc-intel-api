import { createContext, useContext, useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { chatApi } from '../api/chat'
import type { ChatResponse } from '../types'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: { document_id: number; filename: string }[]
}

interface ChatContextType {
  messages: ChatMessage[]
  sendMessage: (query: string) => void
  searchThenChat: (query: string) => Promise<void>
  lastSearchQuery: string | null
  lastSearchResults: any[]
  clearChat: () => void
  isLoading: boolean
  selectedDocId: number | undefined
  setSelectedDocId: (id: number | undefined) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>()
  const [lastSearchQuery, setLastSearchQuery] = useState<string | null>(null)
  const [lastSearchResults, setLastSearchResults] = useState<any[]>([])

  const chatMutation = useMutation({
    mutationFn: chatApi.chat,
    onSuccess: (data: ChatResponse) => {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          sources: data.metadata.sources,
        },
      ])
      // update local analytics: mark docs as used
      try {
        data.metadata.sources.forEach((s) => {
          const key = `doc_stats_${s.document_id}`
          const raw = localStorage.getItem(key)
          const stat = raw ? JSON.parse(raw) : { timesQueried: 0, lastUsed: null, successes: 0, failures: 0, favorite: false }
          stat.timesQueried += 1
          stat.lastUsed = new Date().toISOString()
          stat.successes += data.answer ? 1 : 0
          localStorage.setItem(key, JSON.stringify(stat))
        })
      } catch (e) {
        // ignore storage failures
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to get response'
      toast.error(message)
    },
  })

  const sendMessage = (query: string) => {
    if (!query.trim()) return

    setMessages((prev) => [...prev, { role: 'user', content: query }])

    chatMutation.mutate({
      query,
      document_id: selectedDocId,
      limit: 3,
    })
  }

  const searchThenChat = async (query: string) => {
    if (!query.trim()) return
    // call search first for retrieval transparency
    try {
      setLastSearchQuery(query)
      const results = await chatApi.search({ query, document_id: selectedDocId, limit: 5 })
      setLastSearchResults(results || [])
    } catch (e) {
      setLastSearchResults([])
    }

    // then send chat request
    sendMessage(query)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        searchThenChat,
        lastSearchQuery,
        lastSearchResults,
        clearChat,
        isLoading: chatMutation.isPending,
        selectedDocId,
        setSelectedDocId,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
