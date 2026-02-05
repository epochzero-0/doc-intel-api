export default function ProcessingTimeline({ status }: { status: 'processing' | 'completed' | 'failed' }) {
  const steps = [
    { key: 'uploaded', label: 'Uploaded' },
    { key: 'extract', label: 'Extraction' },
    { key: 'embed', label: 'Embedding' },
    { key: 'index', label: 'Indexing' },
  ]

  const activeIndex = status === 'processing' ? 1 : status === 'completed' ? 3 : 2

  return (
    <div className="mt-2 text-xs">
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${i <= activeIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
            <div className={`text-xs ${i <= activeIndex ? 'text-gray-800' : 'text-gray-400'}`}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
