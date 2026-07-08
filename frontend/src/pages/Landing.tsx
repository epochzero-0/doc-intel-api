import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth'

const features = [
  {
    title: 'Upload & process',
    description:
      'Drop in PDF, DOCX, or TXT files. Documents are parsed, chunked, and embedded in the background while you keep working.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
      />
    ),
  },
  {
    title: 'Chat with citations',
    description:
      'Ask questions in natural language and get grounded RAG answers with inline citations and a source drawer listing every document used.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    ),
  },
  {
    title: 'Retrieval Inspector',
    description:
      'See the top semantic matches before the AI answers. Preview snippets and relevance so retrieval is transparent, not a black box.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    ),
  },
  {
    title: 'Per-document analytics',
    description:
      'Track how each document is used: times queried, last accessed, and success rate, surfaced right alongside your library.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  },
]

export default function Landing() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="relative min-h-screen bg-white text-gray-900 overflow-hidden">
      {/* Soft ambient accents */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 left-1/2 -translate-x-1/2 h-[36rem] w-[36rem] rounded-full bg-blue-200/40 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] rounded-full bg-indigo-200/40 blur-3xl" />
      </div>

      <div className="relative">
        {/* Nav */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <span className="text-xl font-bold tracking-tight text-gray-900">
            Doc<span className="text-blue-600">Intel</span>
          </span>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition"
              >
                Go to App
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg font-medium transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold transition shadow-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero */}
        <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 sm:pt-24 sm:pb-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
              Retrieval-Augmented Generation, made transparent
            </span>
            <h1 className="mt-8 text-4xl sm:text-6xl font-bold tracking-tight leading-tight text-gray-900">
              Chat with your documents.
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Trust every answer.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-600">
              Upload PDFs, Word docs, and text files, then ask questions in plain
              language. Doc Intel returns cited, grounded answers, and shows you
              exactly which passages it retrieved before it responds.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to={isAuthenticated ? '/app' : '/register'}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-lg font-semibold text-lg transition shadow-lg shadow-blue-600/20"
              >
                {isAuthenticated ? 'Open the App' : 'Get Started Free'}
              </Link>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="w-full sm:w-auto border border-gray-300 hover:border-gray-400 text-gray-800 px-8 py-3.5 rounded-lg font-semibold text-lg transition"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        </header>

        {/* Features */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: 'easeOut' }}
                className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm hover:shadow-md hover:border-blue-300 transition"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    {feature.icon}
                  </svg>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Footer strip */}
        <footer className="border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <span>
              Doc<span className="text-blue-600">Intel</span>, document
              intelligence powered by RAG
            </span>
            {!isAuthenticated && (
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Create your account →
              </Link>
            )}
          </div>
        </footer>
      </div>
    </div>
  )
}
