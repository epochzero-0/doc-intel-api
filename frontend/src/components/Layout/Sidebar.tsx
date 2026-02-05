import { useDocuments } from '../../hooks/useDocuments'
import { useChat } from '../../hooks/useChat'
import type { Document } from '../../types'

function StatusBadge({ status }: { status: Document['status'] }) {
  const colors = {
    processing: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`text-xs px-2 py-1 rounded-full ${colors[status]}`}>
      {status}
    </span>
  )
}

export default function Sidebar() {
  const { documents, isLoading, refetch, deleteDocument } = useDocuments()
  const { selectedDocId, setSelectedDocId, clearChat } = useChat()

  const handleSelect = (doc: Document) => {
    if (doc.status === 'completed') {
      setSelectedDocId(doc.id === selectedDocId ? undefined : doc.id)
      clearChat()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900">Documents</h2>
        <button
          onClick={() => refetch()}
          className="text-sm text-blue-600 hover:text-blue-800"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : documents.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">
          No documents yet. Upload one to get started.
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              onClick={() => handleSelect(doc)}
              className={`p-3 rounded-lg cursor-pointer transition border ${
                selectedDocId === doc.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-transparent hover:bg-gray-50'
              } ${doc.status !== 'completed' ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={doc.status} />
                    {doc.status === 'processing' && (
                      <svg className="animate-spin h-4 w-4 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Delete this document?')) {
                      deleteDocument(doc.id)
                    }
                  }}
                  className="text-gray-400 hover:text-red-600 p-1"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
