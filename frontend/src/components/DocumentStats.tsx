import { useEffect, useState } from 'react'

type Stat = {
  timesQueried: number
  lastUsed: string | null
  successes: number
  failures: number
  favorite: boolean
}

export default function DocumentStats({ docId }: { docId: number }) {
  const key = `doc_stats_${docId}`
  const [stat, setStat] = useState<Stat | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem(key)
    if (raw) setStat(JSON.parse(raw))
  }, [key])

  const toggleFavorite = () => {
    const current = stat || { timesQueried: 0, lastUsed: null, successes: 0, failures: 0, favorite: false }
    const next = { ...current, favorite: !current.favorite }
    localStorage.setItem(key, JSON.stringify(next))
    setStat(next)
  }

  if (!stat) {
    return (
      <div className="text-xs text-gray-500">No stats yet</div>
    )
  }

  const successRate = stat.timesQueried === 0 ? 0 : Math.round((stat.successes / stat.timesQueried) * 100)

  return (
    <div className="bg-white rounded-lg p-3 text-xs text-gray-700 space-y-2">
      <div className="flex items-center justify-between">
        <div>Queries: <strong>{stat.timesQueried}</strong></div>
        <button onClick={toggleFavorite} className={`text-sm ${stat.favorite ? 'text-yellow-500' : 'text-gray-300'}`} title="Favorite">★</button>
      </div>
      <div>Last used: {stat.lastUsed ? new Date(stat.lastUsed).toLocaleString() : '—'}</div>
      <div>Success rate: <strong>{successRate}%</strong></div>
    </div>
  )
}
