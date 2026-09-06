import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input, Checkbox } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'
import { AuthShell } from './AuthMarketing'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded bg-[var(--color-brand)] text-[var(--color-on-brand)] text-sm font-bold flex items-center justify-center">DF</div>
        <span className="font-semibold">DealFlow360</span>
      </Link>
      <h1 className="text-2xl font-bold">Sign in to your account</h1>
      <p className="text-[var(--color-muted)] mt-1 text-sm">Access your sales operations workspace</p>

      <form className="mt-8 space-y-4 max-w-sm" onSubmit={handleSubmit}>
        {error && (
          <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] border border-[var(--color-border)] rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          required
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Don't have an account? <Link to="/signup" className="text-[var(--color-brand)] font-medium">Create one</Link>
      </p>
    </AuthShell>
  )
}

export function SignupPage() {
  const navigate = useNavigate()
  const { signup, isAuthenticated } = useAuth()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const errs: Record<string, string> = {}
    if (!fd.get('name')) errs.name = 'Required'
    if (!fd.get('email')) errs.email = 'Required'
    if ((fd.get('password') as string)?.length < 8) errs.password = 'Min 8 characters'
    if (fd.get('password') !== fd.get('confirm')) errs.confirm = 'Passwords must match'
    if (!fd.get('terms')) errs.terms = 'You must agree to continue'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setApiError('')
    setLoading(true)
    try {
      await signup({
        name: fd.get('name') as string,
        email: fd.get('email') as string,
        password: fd.get('password') as string,
        role: (fd.get('role') as 'REP' | 'MANAGER' | 'FINANCE' | 'ADMIN') || 'REP',
      })
      navigate('/app')
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <Link to="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 rounded bg-[var(--color-brand)] text-[var(--color-on-brand)] text-sm font-bold flex items-center justify-center">DF</div>
        <span className="font-semibold">DealFlow360</span>
      </Link>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="text-[var(--color-muted)] mt-1 text-sm">Get started with DealFlow360</p>

      <form className="mt-8 space-y-4 max-w-md" onSubmit={handleSubmit}>
        {apiError && (
          <div className="text-sm text-[var(--color-danger)] bg-[var(--color-danger-bg)] border border-[var(--color-border)] rounded-md px-3 py-2">
            {apiError}
          </div>
        )}
        <Input name="name" label="Full Name" placeholder="Your name" error={errors.name} required />
        <Input name="email" label="Work Email" type="email" placeholder="you@company.com" error={errors.email} required />
        <Input name="password" label="Password" type="password" error={errors.password} required />
        <Input name="confirm" label="Confirm Password" type="password" error={errors.confirm} required />
        <Checkbox name="terms" label="I agree to the Terms of Service and Privacy Policy" />
        {errors.terms && <p className="text-xs text-[var(--color-danger)]">{errors.terms}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create Account'}
        </Button>
      </form>
      <p className="mt-6 text-sm text-[var(--color-muted)]">
        Already have an account? <Link to="/login" className="text-[var(--color-brand)] font-medium">Sign in</Link>
      </p>
    </AuthShell>
  )
}
