import axios from 'axios'
import toast from 'react-hot-toast'

// Resolve API base URL with safe fallbacks:
// 1) Vite build-time env: import.meta.env.VITE_API_URL
// 2) Runtime override: window.__API_URL__ (can be injected into index.html)
// 3) Runtime meta tag: <meta name="api-url" content="https://api.example.com">
// 4) Fallback to window.location.origin (useful if backend is proxied)
const buildTimeBase = import.meta.env.VITE_API_URL
const runtimeOverride = (window as Window & { __API_URL__?: string }).__API_URL__
const metaEl = typeof document !== 'undefined' ? document.querySelector('meta[name="api-url"]') : null
const metaUrl = metaEl?.getAttribute('content') || null

let resolvedBase = buildTimeBase || runtimeOverride || metaUrl || ''

// If still empty, fallback to current origin
if (!resolvedBase) {
  if (typeof window !== 'undefined') resolvedBase = window.location.origin
}

// Diagnostic log to help debugging deployed clients
if (typeof window !== 'undefined') {
  const host = window.location.hostname
  if (resolvedBase.includes('localhost') && host !== 'localhost' && host !== '127.0.0.1') {
    // likely a misconfiguration: built with localhost; recommend setting runtime meta or window.__API_URL__
    console.warn('[Doc-Intel] API base resolved to localhost while frontend is running on', host)
    console.info('[Doc-Intel] Tried build-time VITE_API_URL, window.__API_URL__, <meta name="api-url">. Consider setting VITE_API_URL at build or a runtime meta tag.')
  }
}

const api = axios.create({
  baseURL: resolvedBase,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle 401. A failed login is also a 401; let the login form show it.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
      toast.error('Session expired. Please login again.')
    }
    return Promise.reject(error)
  }
)

export default api
