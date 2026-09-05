import { type FormEvent, useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("rahul@dealflow.com")
  const [password, setPassword] = useState("demo1234")
  const [error, setError] = useState<string | null>(null)

  if (sessionStorage.getItem("df_user")) {
    return <Navigate to="/" replace />
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!email.includes("@") || password.length < 4) {
      setError("Enter a valid work email and password.")
      return
    }
    sessionStorage.setItem("df_user", "Rahul Sales")
    navigate("/")
  }

  return (
    <div className="login">
      <div className="login-card">
        <p className="brand">dealflow</p>
        <h1>Sign in</h1>
        <p className="lede">Sales workspace for quotations and approvals.</p>
        <form onSubmit={onSubmit}>
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              autoComplete="username"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error ? <p className="err">{error}</p> : null}
          <button className="btn" type="submit">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
