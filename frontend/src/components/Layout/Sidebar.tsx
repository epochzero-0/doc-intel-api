import { useState } from 'react'
import { useDocuments } from '../../hooks/useDocuments'
import { useChat } from '../../hooks/useChat'
import type { Document } from '../../types'
import StatusPill from '../ui/StatusPill'
import { Button } from '../ui/Button'
import UploadSection from '../Upload/UploadSection'

function usage(docId: number): string | null {
  try {
    const raw = localStorage.getItem(`doc_stats_${docId}`)
    if (!raw) return null
    const { timesQueried, lastUsed } = JSON.parse(raw)
    if (!timesQueried) return null
    const when = lastUsed ? new Date(lastUsed).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : null
    return `Used in ${timesQueried} ${timesQueried === 1 ? 'answer' : 'answers'}${when ? `, last ${when}` : ''}`
  } catch {
    return null
  }
}

function added(doc: Document) {
  return new Date(doc.created_at + (doc.created_at.endsWith('Z') ? '' : 'Z')).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

function DocumentRow({ doc }: { doc: Document }) {
  const { documentId, setDocumentId } = useChat()
  const { deleteDocument, deletingId } = useDocuments()
  const [confirming, setConfirming] = useState(false)
  const selected = documentId === doc.id
  const ready = doc.status === 'completed'

  const detail =
    doc.status === 'processing'
      ? 'Extracting text and building the index'
      : doc.status === 'failed'
        ? 'Could not read this file. A scanned PDF has no text layer; run OCR on it and upload again.'
        : (usage(doc.id) ?? `Added ${added(doc)}`)

  if (confirming) {
    return (
      <li className="grid gap-2 rounded border border-bad/30 bg-bad-soft p-3">
        <p className="text-sm text-bad">
          Delete <span className="break-all font-mono text-xs">{doc.filename}</span>? Its chunks go too.
        </p>
        <div className="flex gap-2">
          <Button
            variant="danger"
            size="sm"
            disabled={deletingId === doc.id}
            onClick={() => {
              if (selected) setDocumentId(undefined)
              deleteDocument(doc.id)
            }}
          >
            {deletingId === doc.id ? 'Deleting…' : 'Delete'}
          </Button>
          <Button variant="quiet" size="sm" onClick={() => setConfirming(false)}>
            Keep it
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className={`group relative rounded transition-colors ${selected ? 'bg-surface ring-1 ring-inset ring-line' : 'hover:bg-surface'}`}>
      <button
        type="button"
        disabled={!ready}
        aria-pressed={selected}
        onClick={() => setDocumentId(selected ? undefined : doc.id)}
        className="grid w-full gap-1.5 rounded p-3 pr-10 text-left disabled:cursor-default"
        title={ready ? (selected ? 'Ask across all documents' : 'Ask about this document only') : undefined}
      >
        <span className="truncate font-mono text-xs text-ink">{doc.filename}</span>
        <span className="flex flex-wrap items-center gap-2">
          <StatusPill status={doc.status} />
          {selected && <span className="font-mono text-label uppercase text-muted">Asking this one</span>}
        </span>
        <span className={`text-xs ${doc.status === 'failed' ? 'text-bad' : 'text-muted'}`}>{detail}</span>
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${doc.filename}`}
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded text-muted hover:bg-surface-2 hover:text-bad"
      >
        <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </li>
  )
}

export default function Sidebar() {
  const { documents, isLoading, isError, refetch } = useDocuments()
  const ready = documents.filter((d) => d.status === 'completed').length

  return (
    <div className="grid content-start gap-4 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-mono text-label uppercase text-muted">Library</h2>
        {documents.length > 0 && (
          <span className="font-mono text-xs tabular-nums text-muted">
            {ready} of {documents.length} ready
          </span>
        )}
      </div>

      <UploadSection />

      {isLoading ? (
        <p role="status" className="text-sm text-muted">
          Loading your documents…
        </p>
      ) : isError ? (
        <div className="grid gap-2 text-sm">
          <p className="text-bad">Could not load your documents.</p>
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : documents.length === 0 ? (
        <div className="grid gap-1 border-t border-line pt-4 text-sm">
          <p className="font-medium">No documents yet</p>
          <p className="text-muted">
            Add a contract, a paper or your notes. Once it shows Ready, ask about it in the chat.
          </p>
        </div>
      ) : (
        <ul className="-mx-1 grid gap-1">
          {documents.map((doc) => (
            <DocumentRow key={doc.id} doc={doc} />
          ))}
        </ul>
      )}
    </div>
  )
}
