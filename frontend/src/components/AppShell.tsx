import { NavLink, Outlet, useNavigate } from "react-router-dom"

export function AppShell() {
  const navigate = useNavigate()
  const name = sessionStorage.getItem("df_user") ?? "Rahul Sales"

  function logout() {
    sessionStorage.removeItem("df_user")
    navigate("/login")
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand">
          dealflow
        </NavLink>
        <nav className="nav" aria-label="Primary">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/quotations">Quotations</NavLink>
          <NavLink to="/approvals">Approvals</NavLink>
        </nav>
        <div className="who">
          {name}
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  )
}
