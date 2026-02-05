interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant'
    content: string
    sources?: { document_id: number; filename: string }[]
  }
}

function renderCitations(content: string, sources?: { document_id: number; filename: string }[]) {
  if (!sources || sources.length === 0) {
    return content
  }

  // Replace [1], [2], etc. with styled citations
  const parts = content.split(/(\[\d+\])/)
  return parts.map((part, idx) => {
    const match = part.match(/\[(\d+)\]/)
    if (match) {
      const num = parseInt(match[1], 10)
      return (
        <span
          key={idx}
          className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium mx-0.5"
          title={sources[num - 1]?.filename || `Source ${num}`}
        >
          {num}
        </span>
      )
    }
    return part
  })
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        <p className="whitespace-pre-wrap">
          {renderCitations(message.content, message.sources)}
        </p>

        {/* Sources section for assistant messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-2">Sources:</p>
            <ul className="space-y-1">
              {message.sources.map((source, idx) => (
                <li key={source.document_id} className="text-xs text-gray-600">
                  <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] bg-blue-100 text-blue-700 rounded-full font-medium mr-1">
                    {idx + 1}
                  </span>
                  {source.filename}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
