import { useAuth } from '../hooks/useAuth'
import { ChatProvider } from '../context/ChatContext'
import Sidebar from '../components/Layout/Sidebar'
import MainContent from '../components/Layout/MainContent'
import DashboardLayout from '../components/Layout/DashboardLayout'
import RetrievalInspector from '../components/RetrievalInspector'
import SourceDrawer from '../components/SourceDrawer'
import { useChat } from '../context/ChatContext'

export default function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <ChatProvider>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <h1 className="text-xl font-bold text-gray-900">Doc Intel</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">{user?.email}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <DashboardBody />
        </div>
      </div>
    </ChatProvider>
  )
}

function DashboardBody() {
  const { lastSearchQuery, lastSearchResults, messages } = useChat()

  return (
    <DashboardLayout
      left={<Sidebar />}
      center={<MainContent />}
      right={<>
        <RetrievalInspector query={lastSearchQuery} results={lastSearchResults} />
        <div className="mt-4"><SourceDrawer sources={messages.find((m) => m.role === 'assistant')?.sources || []} open={true} /></div>
      </>}
    />
  )
}
