import ChatSection from '../Chat/ChatSection'
import ChatModes from '../ChatModes'
import QueryHistory from '../QueryHistory'
import { useChat } from '../../context/ChatContext'
import { useState } from 'react'

export default function MainContent() {
  const { messages, searchThenChat } = useChat()
  const [mode, setMode] = useState('rag')

  const recentQueries = messages.filter((m) => m.role === 'user').map((m) => m.content).slice(-6).reverse()

  return (
    <div className="space-y-4 h-full min-h-0 flex flex-col">
      <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
        <h2 className="font-semibold">Chat</h2>
        <div className="flex items-center gap-3">
          <ChatModes mode={mode} setMode={setMode} />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ChatSection />
      </div>

      <div>
        <QueryHistory items={recentQueries} onSelect={(q) => searchThenChat(q)} />
      </div>
    </div>
  )
}

