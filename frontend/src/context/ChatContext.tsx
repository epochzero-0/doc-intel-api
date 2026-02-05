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
  clearChat: () => void
  isLoading: boolean
  selectedDocId: number | undefined
  setSelectedDocId: (id: number | undefined) => void
}

const ChatContext = createContext<ChatContextType | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>()

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

  const clearChat = () => {
    setMessages([])
  }

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
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
