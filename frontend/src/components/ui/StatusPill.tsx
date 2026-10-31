import type { Document } from '../../types'

const styles: Record<Document['status'], { label: string; cls: string; dot: string }> = {
  completed: { label: 'Ready', cls: 'bg-ok-soft text-ok', dot: '' },
  processing: { label: 'Processing', cls: 'bg-warn-soft text-warn', dot: 'animate-pulse' },
  failed: { label: 'Failed', cls: 'bg-bad-soft text-bad', dot: '' },
}

export default function StatusPill({ status }: { status: Document['status'] }) {
  const s = styles[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 font-mono text-label uppercase ${s.cls}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full bg-current ${s.dot}`} />
      {s.label}
    </span>
  )
}
