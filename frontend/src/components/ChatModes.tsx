import React from 'react'

export default function ChatModes({ mode, setMode }: { mode: string; setMode: (m: string) => void }) {
  const modes = [
    { id: 'semantic', label: 'Semantic Search' },
    { id: 'rag', label: 'RAG Answer' },
    { id: 'strict', label: 'Strict Document' },
  ]

  return (
    <div className="flex items-center gap-2">
      {modes.map((m) => (
        <button key={m.id} onClick={() => setMode(m.id)} className={`px-3 py-1 rounded ${mode === m.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>
          {m.label}
        </button>
      ))}
    </div>
  )
}
