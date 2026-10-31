import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { useDocuments } from '../hooks/useDocuments'
import { ChatProvider } from '../context/ChatProvider'
import Sidebar from '../components/Layout/Sidebar'
import ChatSection from '../components/Chat/ChatSection'
import RetrievalInspector from '../components/RetrievalInspector'
import Logo from '../components/ui/Logo'
import { Button } from '../components/ui/Button'

type Pane = 'library' | 'chat' | 'passages'

export default function Dashboard() {
  const { user, logout } = useAuth()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [])

  return (
    <ChatProvider userId={user?.id}>
      <div className="flex h-dvh flex-col">
        <header className="flex h-bar shrink-0 items-center justify-between gap-3 border-b border-line px-4">
          <Logo to="/app" />
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden truncate font-mono text-xs text-muted sm:inline">{user?.email}</span>
            <Button variant="quiet" size="sm" onClick={logout}>
              Sign out
            </Button>
          </div>
        </header>
        <Workspace />
      </div>
    </ChatProvider>
  )
}

function Workspace() {
  const [pane, setPane] = useState<Pane>('chat')
  const { turns, activeTurnId } = useChat()
  const { documents } = useDocuments()
  const passageCount = turns.find((t) => t.id === activeTurnId)?.passages?.length

  const tabs: { id: Pane; label: string; count?: number }[] = [
    { id: 'library', label: 'Library', count: documents.length || undefined },
    { id: 'chat', label: 'Chat' },
    { id: 'passages', label: 'Passages', count: passageCount || undefined },
  ]

  // Below lg the three panes become tabs; at lg and up they sit side by side and the tabs hide.
  const show = (id: Pane) => (pane === id ? 'flex' : 'hidden') + ' lg:flex'

  return (
    <>
      <nav className="flex shrink-0 border-b border-line lg:hidden" aria-label="Workspace">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setPane(t.id)}
            aria-current={pane === t.id ? 'page' : undefined}
            className={`flex h-11 flex-1 items-center justify-center gap-1.5 border-b-2 text-sm transition-colors ${
              pane === t.id ? 'border-ink font-medium text-ink' : 'border-transparent text-muted'
            }`}
          >
            {t.label}
            {t.count !== undefined && <span className="font-mono text-xs tabular-nums text-muted">{t.count}</span>}
          </button>
        ))}
      </nav>

      <main className="grid min-h-0 flex-1 lg:grid-cols-[17rem_minmax(0,1fr)_21rem] xl:grid-cols-[18rem_minmax(0,1fr)_24rem]">
        <section aria-label="Library" className={`${show('library')} min-h-0 flex-col overflow-y-auto lg:border-r lg:border-line`}>
          <Sidebar />
        </section>
        <section aria-label="Chat" className={`${show('chat')} min-h-0 flex-col`}>
          <ChatSection onShowPassages={() => setPane('passages')} onShowLibrary={() => setPane('library')} />
        </section>
        <section aria-label="Passages" className={`${show('passages')} min-h-0 flex-col overflow-y-auto lg:border-l lg:border-line`}>
          <RetrievalInspector />
        </section>
      </main>
    </>
  )
}
