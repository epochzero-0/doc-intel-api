import { motion } from 'framer-motion'
import type { SearchResult } from '../types'

function scoreMatch(query: string, content: string) {
  if (!query) return 0
  const q = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = content.toLowerCase()
  const matches = q.filter((w) => text.includes(w)).length
  // simple heuristic: proportion of query words present
  return Math.min(1, matches / Math.max(1, q.length))
}

export default function RetrievalInspector({
  query,
  results,
}: {
  query: string | null
  results: SearchResult[]
}) {
  // The inspector must live in its own column. Do not force a max-width here.
  // Provide full-height scrolling and prevent x-overflow.
  const containerCls = 'bg-white rounded-xl shadow-sm p-4 space-y-3 h-full overflow-y-auto overflow-x-hidden break-words'

  if (!query) {
    return (
      <div className={containerCls}>
        <p className="text-sm text-gray-500">Retrieval inspector will show here.</p>
      </div>
    )
  }

  return (
    <div className={containerCls}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 truncate">Retrieval Inspector</h3>
        <p className="text-xs text-gray-500">Query preview</p>
      </div>

      <div className="text-sm text-gray-700 p-2 bg-gray-50 rounded whitespace-normal break-all line-clamp-2">
        {query}
      </div>

      <div className="space-y-2">
        {results.length === 0 ? (
          <p className="text-xs text-gray-500">No matches found.</p>
        ) : (
          results.map((r, idx) => {
            const score = scoreMatch(query, r.content)
            const pct = Math.round(score * 100)
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="p-2 border rounded min-w-0">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 truncate">{`Document ${r.document_id}`}</div>
                  <div className="text-xs text-gray-500">Chunk {r.chunk_index}</div>
                </div>

                <div className="mt-2 flex items-center gap-3 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="h-2 bg-gray-200 rounded overflow-hidden min-w-0">
                      <div className="h-2 bg-blue-500" style={{ width: `${pct}%`, maxWidth: '100%' }} />
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 break-words">{r.content}</p>
                  </div>
                  <div className="w-12 flex-shrink-0 text-right">
                    <div className="text-sm font-semibold">{pct}%</div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
