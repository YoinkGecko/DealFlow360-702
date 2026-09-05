import { Navigate, Outlet } from "react-router-dom"

export function RequireSession() {
  if (!sessionStorage.getItem("df_user")) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
