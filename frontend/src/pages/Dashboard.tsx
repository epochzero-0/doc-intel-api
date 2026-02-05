import { useAuth } from '../hooks/useAuth'
import { ChatProvider } from '../context/ChatContext'
import Sidebar from '../components/Layout/Sidebar'
import MainContent from '../components/Layout/MainContent'

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
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar */}
            <div className="w-full lg:w-80 flex-shrink-0">
              <Sidebar />
            </div>

            {/* Main Content */}
            <div className="flex-1">
              <MainContent />
            </div>
          </div>
        </div>
      </div>
    </ChatProvider>
  )
}
