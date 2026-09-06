import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Input, Checkbox, Select } from '../../components/ui/Input'
import { useAuth } from '../../context/AuthContext'
import { ApiError } from '../../lib/api'

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
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 bg-white">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-[#1565C0] text-white text-sm font-bold flex items-center justify-center">DF</div>
          <span className="font-semibold">DealFlow360</span>
        </Link>
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        <p className="text-[#6b7280] mt-1 text-sm">Access your sales operations workspace</p>

        <form className="mt-8 space-y-4 max-w-sm" onSubmit={handleSubmit}>
          {error && (
            <div className="text-sm text-[#c62828] bg-[#ffebee] border border-[#ffcdd2] rounded-md px-3 py-2">
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
          <div className="flex items-center justify-between text-sm">
            <Checkbox label="Remember me" />
            <a href="#" className="text-[#1565C0] hover:underline">Forgot password?</a>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <div className="max-w-sm mt-6">
          <div className="flex items-center gap-3 text-xs text-[#6b7280]">
            <div className="flex-1 h-px bg-[#e8eaed]" />
            OR
            <div className="flex-1 h-px bg-[#e8eaed]" />
          </div>
          <Button variant="secondary" className="w-full mt-4" disabled>
            Continue with Google
          </Button>
        </div>

        <p className="mt-6 text-sm text-[#6b7280]">
          Don't have an account? <Link to="/signup" className="text-[#1565C0] font-medium">Create one</Link>
        </p>
      </div>

      <div className="hidden lg:flex flex-col justify-center bg-[#f5f6f8] border-l border-[#e8eaed] p-12">
        <h2 className="text-xl font-semibold">Policy-driven deal evaluation</h2>
        <p className="text-[#6b7280] mt-2 text-sm leading-relaxed">
          When a rep submits a quote with 20% discount on Software, the system instantly evaluates against tier ceilings and routes for approval.
        </p>
        <div className="mt-6 bg-white border border-[#e8eaed] rounded-lg p-4 text-sm space-y-2">
          <div className="flex justify-between"><span className="text-[#6b7280]">Blended Risk</span><span className="font-bold text-[#c62828]">18.4%</span></div>
          <div className="flex justify-between"><span className="text-[#6b7280]">Rule violated</span><span>Gold / Services ceiling</span></div>
          <div className="flex justify-between"><span className="text-[#6b7280]">Decision</span><span className="font-medium">Manager + Finance</span></div>
        </div>
      </div>
    </div>
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
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center bg-[#1565C0] text-white p-12">
        <h2 className="text-2xl font-bold">Your sales operations, governed automatically.</h2>
        <ul className="mt-6 space-y-3 text-white/90 text-sm">
          {['Automated approvals', 'Risk-based pricing governance', 'Inventory intelligence', 'Unified billing'].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 lg:px-16 bg-white">
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded bg-[#1565C0] text-white text-sm font-bold flex items-center justify-center">DF</div>
          <span className="font-semibold">DealFlow360</span>
        </Link>
        <h1 className="text-2xl font-bold">Create your account</h1>
        <p className="text-[#6b7280] mt-1 text-sm">Start governing deals in minutes</p>

        <form className="mt-8 space-y-4 max-w-md" onSubmit={handleSubmit}>
          {apiError && (
            <div className="text-sm text-[#c62828] bg-[#ffebee] border border-[#ffcdd2] rounded-md px-3 py-2">
              {apiError}
            </div>
          )}
          <Input name="name" label="Full Name" placeholder="Your name" error={errors.name} required />
          <Input name="email" label="Work Email" type="email" placeholder="you@company.com" error={errors.email} required />
          <Select
            name="role"
            label="Role"
            defaultValue="REP"
            options={[
              { value: 'REP', label: 'Sales Rep' },
              { value: 'MANAGER', label: 'Manager' },
              { value: 'FINANCE', label: 'Finance' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
          />
          <Input name="company" label="Company" placeholder="Acme Corporation" />
          <Input name="password" label="Password" type="password" error={errors.password} required />
          <Input name="confirm" label="Confirm Password" type="password" error={errors.confirm} required />
          <Checkbox name="terms" label="I agree to the Terms of Service and Privacy Policy" />
          {errors.terms && <p className="text-xs text-[#c62828]">{errors.terms}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </Button>
        </form>
        <p className="mt-6 text-sm text-[#6b7280]">
          Already have an account? <Link to="/login" className="text-[#1565C0] font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
