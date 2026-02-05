export default function SourceDrawer({ sources, open }: { sources: { document_id: number; filename: string }[]; open: boolean }) {
  if (!open) return null

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="text-sm font-semibold mb-2">Sources</h3>
      {sources.length === 0 ? (
        <p className="text-xs text-gray-500">No sources.</p>
      ) : (
        <ul className="text-xs space-y-2">
          {sources.map((s, idx) => (
            <li key={s.document_id} className="flex items-center justify-between">
              <div className="truncate">{idx + 1}. {s.filename}</div>
              <div className="text-gray-400 text-[11px]">ID {s.document_id}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
