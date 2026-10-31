import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { useDocuments } from '../hooks/useDocuments'
import { ANSWER_CHUNKS } from '../context/chat'
import type { SearchResult } from '../types'
import Highlighted from './Passages/Highlighted'
import Working from './ui/Working'

function Passage({ p, rank, query, name, sent, focused }: { p: SearchResult; rank: number; query: string; name: string; sent: boolean; focused: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)

  useEffect(() => {
    if (focused) {
      setOpen(true)
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [focused])

  return (
    <li
      ref={ref}
      id={`passage-${rank}`}
      className={`grid grid-cols-[1.5rem_1fr] gap-x-2 border-b border-line py-3 transition-colors last:border-0 ${focused ? 'bg-hl-soft/60' : ''}`}
    >
      <span className={`pt-0.5 text-right font-mono text-xs ${sent ? 'text-ink' : 'text-muted'}`}>{rank}</span>
      <div className="grid min-w-0 gap-1.5 pr-1">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate font-mono text-xs text-ink">{name}</span>
          <span className="font-mono text-xs text-muted">chunk {p.chunk_index}</span>
          {sent && <span className="font-mono text-label uppercase text-cite">Sent to model</span>}
        </div>
        <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${open ? '' : 'line-clamp-4'}`}>
          <Highlighted text={p.content} query={query} />
        </p>
        {p.content.length > 220 && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="justify-self-start rounded-sm text-xs text-muted underline underline-offset-4 hover:text-ink"
          >
            {open ? 'Show less' : 'Show the whole chunk'}
          </button>
        )}
      </div>
    </li>
  )
}

export default function RetrievalInspector() {
  const { turns, activeTurnId, focusedRank } = useChat()
  const { documents } = useDocuments()
  const names = new Map(documents.map((d) => [d.id, d.filename]))
  const turn = turns.find((t) => t.id === activeTurnId)

  return (
    <div className="grid content-start gap-3 p-4">
      <div className="grid gap-1">
        <h2 className="font-mono text-label uppercase text-muted">Passages</h2>
        {turn && <p className="line-clamp-2 text-sm font-medium">{turn.query}</p>}
      </div>

      {!turn ? (
        <p className="text-sm text-muted">
          Ask a question and the passages the search returned show here, best match first.
        </p>
      ) : turn.passages === null ? (
        <Working>Searching</Working>
      ) : turn.passages.length === 0 ? (
        <p className="text-sm text-muted">
          {turn.status === 'error' ? 'The search did not return.' : 'Nothing matched this question.'}
        </p>
      ) : (
        <>
          <ol className="-mx-1">
            {turn.passages.map((p, i) => (
              <Passage
                key={`${turn.id}-${p.document_id}-${p.chunk_index}`}
                p={p}
                rank={i + 1}
                query={turn.query}
                name={names.get(p.document_id) ?? `Document ${p.document_id}`}
                sent={turn.mode === 'answer' && i < ANSWER_CHUNKS}
                focused={focusedRank === i + 1}
              />
            ))}
          </ol>
          <p className="border-t border-line pt-3 text-xs leading-relaxed text-muted">
            Ranked by vector similarity to your question. The API returns the order, not a score.
            {turn.mode === 'answer' && ` The answer was written from the top ${ANSWER_CHUNKS}, numbered as its citations.`}{' '}
            Yellow words appear in your question.
          </p>
        </>
      )}
    </div>
  )
}
