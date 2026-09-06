import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { UserRole } from '../data/mock'
import { getStoredToken } from '../lib/api'
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  signupUser,
  toAppUser,
} from '../lib/auth'

export interface AppUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthState {
  user: AppUser | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: {
    name: string
    email: string
    password: string
    role: 'REP' | 'MANAGER' | 'FINANCE' | 'ADMIN'
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setLoading(false)
      return
    }

    fetchCurrentUser()
      .then((apiUser) => setUser(toAppUser(apiUser)))
      .catch(() => {
        logoutUser()
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const session = await loginUser(email, password)
    setUser(toAppUser(session.user))
  }, [])

  const signup = useCallback(
    async (data: {
      name: string
      email: string
      password: string
      role: 'REP' | 'MANAGER' | 'FINANCE' | 'ADMIN'
    }) => {
      const session = await signupUser(data)
      setUser(toAppUser(session.user))
    },
    [],
  )

  const logout = useCallback(() => {
    logoutUser()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      login,
      signup,
      logout,
    }),
    [user, loading, login, signup, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
