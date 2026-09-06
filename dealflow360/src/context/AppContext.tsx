import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { NOTIFICATIONS, type Notification } from '../data/mock'
import { useAuth } from './AuthContext'
import type { AppUser } from './AuthContext'

interface AppState {
  user: AppUser
  notifications: Notification[]
  toast: string | null
  showToast: (msg: string) => void
  markNotificationRead: (id: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  if (!user) {
    throw new Error('AppProvider requires an authenticated user')
  }

  const [notifications, setNotifications] = useState(NOTIFICATIONS)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const value = useMemo(
    () => ({
      user,
      notifications,
      toast,
      showToast,
      markNotificationRead: (id: string) =>
        setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x))),
    }),
    [user, notifications, toast, showToast],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
