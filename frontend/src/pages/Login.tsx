import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthLayout from '../components/Layout/AuthLayout'
import Field from '../components/ui/Field'
import { Button } from '../components/ui/Button'

export default function Login() {
  const location = useLocation()
  const [email, setEmail] = useState<string>((location.state as { email?: string } | null)?.email ?? '')
  const [password, setPassword] = useState('')
  const { login, isLoginLoading, loginError } = useAuth()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <AuthLayout
      title="Sign in"
      lede="Your documents and questions are where you left them."
      footer={
        <>
          No account yet?{' '}
          <Link to="/register" className="rounded-sm font-medium text-ink underline underline-offset-4">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid gap-5">
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {loginError && (
          <p role="alert" className="rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">
            {loginError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={isLoginLoading} className="w-full">
          {isLoginLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
