import type { ReactNode } from 'react'

export default function DashboardLayout({
  left,
  center,
  right,
}: {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}) {
  return (
    <main className="w-full h-[calc(100vh-80px)] overflow-hidden" style={{}}>
      <div className="grid gap-4 h-full" style={{ gridTemplateColumns: '280px 1fr 380px' }}>
        <div className="h-full overflow-y-auto">{left}</div>
        <div className="h-full min-h-0">{center}</div>
        <div className="h-full overflow-y-auto sticky top-0">{right}</div>
      </div>
    </main>
  )
}
