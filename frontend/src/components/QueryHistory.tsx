export default function QueryHistory({ items, onSelect }: { items: string[]; onSelect: (q: string) => void }) {
  if (!items || items.length === 0) return null
  return (
    <div className="bg-white rounded-xl shadow-sm p-3">
      <h4 className="text-xs font-semibold mb-2">Recent Queries</h4>
      <ul className="text-xs space-y-1">
        {items.map((q, i) => (
          <li key={i} className="flex items-center justify-between">
            <button onClick={() => onSelect(q)} className="text-left truncate text-gray-700">{q}</button>
            <span className="text-gray-400 text-[11px]">{new Date().toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
