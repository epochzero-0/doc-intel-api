import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import AuthLayout from '../components/Layout/AuthLayout'
import Field from '../components/ui/Field'
import { Button } from '../components/ui/Button'

const MIN_PASSWORD = 6

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { register, isRegisterLoading, registerError } = useAuth()

  const mismatch = submitted && confirmPassword !== password ? 'The two passwords are different.' : undefined

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    if (password !== confirmPassword) return
    register({ email, password })
  }

  return (
    <AuthLayout
      title="Create an account"
      lede="Upload a document and ask your first question in about a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="rounded-sm font-medium text-ink underline underline-offset-4">
            Sign in
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
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Field
          id="confirmPassword"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={mismatch}
          required
        />
        {registerError && (
          <p role="alert" className="rounded border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad">
            {registerError}
          </p>
        )}
        <Button type="submit" size="lg" disabled={isRegisterLoading} className="w-full">
          {isRegisterLoading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
