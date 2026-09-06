import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { fetchNotifications, markNotificationReadApi } from '../lib/quotes-api'
import type { ApiNotification } from '../lib/types'
import { useAuth } from './AuthContext'
import type { AppUser } from './AuthContext'

interface AppState {
  user: AppUser
  notifications: ApiNotification[]
  refreshNotifications: () => Promise<void>
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

  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [toast, setToast] = useState<string | null>(null)

  const refreshNotifications = useCallback(async () => {
    try {
      const { notifications: items } = await fetchNotifications()
      setNotifications(items)
    } catch {
      // Keep existing list on transient failures
    }
  }, [])

  useEffect(() => {
    void refreshNotifications()
    const interval = setInterval(() => void refreshNotifications(), 30_000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  const markNotificationRead = useCallback(
    (id: string) => {
      setNotifications((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)))
      void markNotificationReadApi(id).catch(() => {
        void refreshNotifications()
      })
    },
    [refreshNotifications],
  )

  const value = useMemo(
    () => ({
      user,
      notifications,
      refreshNotifications,
      toast,
      showToast,
      markNotificationRead,
    }),
    [user, notifications, refreshNotifications, toast, showToast, markNotificationRead],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
