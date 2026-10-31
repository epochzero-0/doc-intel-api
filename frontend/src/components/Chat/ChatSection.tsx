import { useEffect, useRef, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { useDocuments } from '../../hooks/useDocuments'
import type { AskMode, Document, Turn } from '../../types'
import AnswerText from './AnswerText'
import Working from '../ui/Working'
import { Button } from '../ui/Button'

const MODES: { id: AskMode; label: string; hint: string }[] = [
  { id: 'answer', label: 'Answer', hint: 'A written answer with citations to the passages it used' },
  { id: 'passages', label: 'Passages only', hint: 'Search results only. No model writes anything.' },
]

function TurnView({ turn, names, onShowPassages }: { turn: Turn; names: Map<number, string>; onShowPassages: () => void }) {
  const { ask, retry, focusPassage, setActiveTurnId, activeTurnId, isWorking } = useChat()
  const active = activeTurnId === turn.id
  const scopeName = turn.documentId !== undefined ? names.get(turn.documentId) : undefined
  const passageCount = turn.passages?.length ?? 0

  return (
    <article className="grid gap-3 animate-fade-in" aria-label={`Question: ${turn.query}`}>
      <div className="grid justify-items-end gap-1">
        <p className="max-w-[85%] rounded bg-surface-2 px-3 py-2 text-sm">{turn.query}</p>
        <p className="font-mono text-label uppercase text-muted">
          {turn.mode === 'answer' ? 'Answer' : 'Passages only'}
          {scopeName ? ` · ${scopeName}` : ''}
        </p>
      </div>

      {turn.status === 'working' && (
        <Working>{turn.mode === 'answer' ? 'Finding passages and writing the answer' : 'Searching your documents'}</Working>
      )}

      {turn.status === 'error' && (
        <div role="alert" className="grid gap-2 rounded border border-bad/30 bg-bad-soft p-3 text-sm text-bad">
          <p>{turn.error}</p>
          <Button variant="ghost" size="sm" className="justify-self-start bg-paper" disabled={isWorking} onClick={() => retry(turn.id)}>
            Try again
          </Button>
        </div>
      )}

      {turn.answer !== undefined && (
        <div className="grid gap-3">
          <div className="max-w-prose font-serif text-answer">
            <AnswerText
              text={turn.answer}
              sweep={!turn.restored}
              citationLabel={(n) => {
                const p = turn.passages?.[n - 1]
                return p ? `${names.get(p.document_id) ?? 'document'}, chunk ${p.chunk_index}` : `passage ${n}`
              }}
              onCitation={(n) => {
                focusPassage(turn.id, n)
                onShowPassages()
              }}
            />
          </div>
          {turn.sources && turn.sources.length > 0 && (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
              <span className="font-mono text-label uppercase">Passages from</span>
              {turn.sources.map((s) => (
                <span key={s.document_id} className="break-all font-mono">
                  {s.filename}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {turn.status === 'done' && turn.mode === 'passages' && passageCount === 0 && (
        <p className="text-sm text-muted">No passages matched. Try other words, or ask across all documents.</p>
      )}

      {turn.status !== 'working' && (
        <div className="flex flex-wrap gap-1">
          {passageCount > 0 && (
            <Button
              variant={active ? 'ghost' : 'quiet'}
              size="sm"
              aria-pressed={active}
              onClick={() => {
                setActiveTurnId(turn.id)
                onShowPassages()
              }}
            >
              {`${passageCount} ${passageCount === 1 ? 'passage' : 'passages'}`}
            </Button>
          )}
          <Button variant="quiet" size="sm" disabled={isWorking} onClick={() => ask(turn.query)}>
            Ask again
          </Button>
        </div>
      )}
    </article>
  )
}

function EmptyThread({ documents, onShowLibrary }: { documents: Document[]; onShowLibrary: () => void }) {
  const ready = documents.filter((d) => d.status === 'completed').length
  const processing = documents.some((d) => d.status === 'processing')

  const [title, body] =
    documents.length === 0
      ? ['Upload a document to start', 'Add a PDF, DOCX or TXT file in the library. You can ask about it once it shows Ready.']
      : ready === 0 && processing
        ? ['Your document is processing', 'This usually takes under a minute. The box below unlocks when it shows Ready.']
        : ready === 0
          ? ['None of your documents could be read', 'Upload a file with selectable text. Scanned PDFs need OCR first.']
          : [
              'Ask a question',
              'Answer mode writes a reply with citations; each one links to the passage it came from. Passages only shows the search results without a written answer.',
            ]

  return (
    <div className="grid max-w-prose content-start gap-2 py-6">
      <h3 className="font-serif text-xl font-medium">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
      {ready === 0 && (
        <Button variant="ghost" size="sm" className="mt-2 justify-self-start lg:hidden" onClick={onShowLibrary}>
          Open the library
        </Button>
      )}
    </div>
  )
}

export default function ChatSection({ onShowPassages, onShowLibrary }: { onShowPassages: () => void; onShowLibrary: () => void }) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const { turns, ask, clear, isWorking, mode, setMode, documentId, setDocumentId } = useChat()
  const { documents } = useDocuments()

  const readyDocs = documents.filter((d) => d.status === 'completed')
  const names = new Map(documents.map((d) => [d.id, d.filename]))
  const canAsk = readyDocs.length > 0 && !isWorking
  const last = turns[turns.length - 1]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, last?.status])

  // A scoped document that disappears (deleted, or failed) falls back to all documents.
  useEffect(() => {
    if (documentId !== undefined && !readyDocs.some((d) => d.id === documentId)) setDocumentId(undefined)
  }, [documentId, readyDocs, setDocumentId])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !canAsk) return
    ask(input)
    setInput('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
        <label htmlFor="scope" className="sr-only">
          Ask about
        </label>
        <select
          id="scope"
          value={documentId ?? ''}
          onChange={(e) => setDocumentId(e.target.value ? Number(e.target.value) : undefined)}
          disabled={readyDocs.length === 0}
          className="h-8 min-w-0 max-w-full flex-1 basis-40 truncate rounded border border-edge bg-paper px-2 font-mono text-xs text-ink disabled:opacity-50"
        >
          <option value="">All documents ({readyDocs.length})</option>
          {readyDocs.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.filename}
            </option>
          ))}
        </select>

        <div role="radiogroup" aria-label="Mode" className="flex rounded border border-line p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              title={m.hint}
              onClick={() => setMode(m.id)}
              className={`h-7 rounded-sm px-2.5 text-xs font-medium transition-colors ${
                mode === m.id ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {turns.length > 0 && (
          <Button variant="quiet" size="sm" onClick={clear} disabled={isWorking}>
            Clear
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {turns.length === 0 ? (
          <EmptyThread documents={documents} onShowLibrary={onShowLibrary} />
        ) : (
          <div className="grid gap-8">
            {turns.map((t) => (
              <TurnView key={t.id} turn={t} names={names} onShowPassages={onShowPassages} />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3 sm:p-4">
        <label htmlFor="question" className="sr-only">
          Your question
        </label>
        <input
          id="question"
          type="text"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={readyDocs.length === 0}
          placeholder={
            readyDocs.length === 0
              ? 'Upload a document first'
              : documentId !== undefined
                ? `Ask about ${names.get(documentId)}`
                : 'Ask across all your documents'
          }
          className="h-11 min-w-0 flex-1 rounded border border-edge bg-paper px-3 text-base text-ink placeholder:text-muted hover:border-ink focus:outline-none focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60"
        />
        <Button type="submit" size="md" className="h-11" disabled={!input.trim() || !canAsk}>
          {mode === 'answer' ? 'Ask' : 'Search'}
        </Button>
      </form>
    </div>
  )
}
