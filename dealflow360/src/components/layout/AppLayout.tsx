import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Handshake,
  Users,
  Package,
  Shield,
  CheckSquare,
  Truck,
  CreditCard,
  RefreshCw,
  Sparkles,
  HeartPulse,
  BarChart3,
  Warehouse,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import type { UserRole } from '../../data/mock'

const ROLE_LABELS: Record<UserRole, string> = {
  sales_rep: 'Sales Rep',
  manager: 'Manager',
  finance: 'Finance',
  admin: 'Admin',
  customer: 'Customer',
}

function roleBadgeClass(role: UserRole) {
  const map: Record<UserRole, string> = {
    sales_rep: 'bg-[var(--color-brand-light)] text-[var(--color-brand)]',
    manager: 'bg-[var(--color-badge-manager-bg)] text-[var(--color-warning)]',
    finance: 'bg-[var(--color-badge-finance-bg)] text-[var(--color-badge-finance-text)]',
    admin: 'bg-[var(--color-success-bg)] text-[var(--color-success)]',
    customer: 'bg-[var(--color-bg)] text-[var(--color-muted)]',
  }
  return map[role]
}
const NAV_ITEMS: { path: string; label: string; icon: typeof LayoutDashboard; roles: UserRole[] }[] = [
  { path: '/app', label: 'Overview', icon: LayoutDashboard, roles: ['sales_rep', 'manager', 'finance', 'admin'] },
  { path: '/app/deals', label: 'Deals', icon: Handshake, roles: ['sales_rep', 'manager', 'finance', 'admin'] },
  { path: '/app/customers', label: 'Customers', icon: Users, roles: ['sales_rep', 'manager', 'finance', 'admin'] },
  { path: '/app/products', label: 'Products', icon: Package, roles: ['sales_rep', 'manager', 'admin'] },
  { path: '/app/policies', label: 'Pricing & Policies', icon: Shield, roles: ['admin'] },
  { path: '/app/approvals', label: 'Approvals', icon: CheckSquare, roles: ['sales_rep', 'manager', 'finance', 'admin'] },
  { path: '/app/fulfillment', label: 'Fulfillment', icon: Truck, roles: ['sales_rep', 'manager', 'admin'] },
  { path: '/app/billing', label: 'Billing', icon: CreditCard, roles: ['finance', 'admin'] },
  { path: '/app/subscriptions', label: 'Subscriptions', icon: RefreshCw, roles: ['finance', 'admin'] },
  { path: '/app/recommendations', label: 'Recommendations', icon: Sparkles, roles: ['sales_rep', 'manager', 'admin'] },
  { path: '/app/deal-health', label: 'Deal Health', icon: HeartPulse, roles: ['manager', 'admin'] },
  { path: '/app/analytics', label: 'Analytics', icon: BarChart3, roles: ['manager', 'finance', 'admin'] },
]

const ADMIN_ITEMS: { path: string; label: string; icon: typeof Warehouse; roles: UserRole[] }[] = [
  { path: '/app/warehouses', label: 'Warehouses', icon: Warehouse, roles: ['admin'] },
  { path: '/app/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
]

function formatRole(role: UserRole): string {
  return ROLE_LABELS[role]
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [ref, onClose])
}

export function Sidebar({ mobileOpen, onClose }: { mobileOpen?: boolean; onClose?: () => void }) {
  const location = useLocation()
  const { user } = useApp()

  const visible = (roles: UserRole[]) => roles.includes(user.role)

  const linkClass = (path: string) =>
    cn(
      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
      location.pathname === path || (path !== '/app' && location.pathname.startsWith(path))
        ? 'bg-[var(--color-nav-active-bg)] text-[var(--color-nav-active-text)] font-medium'
        : 'text-[var(--color-muted)] hover:bg-[var(--color-bg)] hover:text-[var(--color-text)]',
    )

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col h-full',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 transition-transform',
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--color-border)]">
          <Link to="/app" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-7 h-7 rounded bg-[var(--color-brand)] flex items-center justify-center text-[var(--color-on-brand)] text-xs font-bold">DF</div>
            <span className="font-semibold text-sm">DealFlow360</span>
          </Link>
          <button className="lg:hidden p-1" onClick={onClose}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.filter((i) => visible(i.roles)).map((item) => (
            <Link key={item.path} to={item.path} className={linkClass(item.path)} onClick={onClose}>
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}

          {ADMIN_ITEMS.some((i) => visible(i.roles)) && (
            <>
              <div className="pt-4 pb-1 px-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">Administration</p>
              </div>
              {ADMIN_ITEMS.filter((i) => visible(i.roles)).map((item) => (
                <Link key={item.path} to={item.path} className={linkClass(item.path)} onClick={onClose}>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-[var(--color-border)] space-y-0.5">
          <Link to="/app/help" className={linkClass('/app/help')} onClick={onClose}>
            <HelpCircle className="w-4 h-4" />
            Help
          </Link>
          <Link to="/app/profile" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--color-bg)] transition-colors" onClick={onClose}>
            <div className="w-7 h-7 rounded-full bg-[var(--color-brand)] text-[var(--color-on-brand)] text-xs flex items-center justify-center font-medium">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-[var(--color-muted)] truncate">{formatRole(user.role)}</p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  )
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { user, notifications, markNotificationRead } = useApp()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const unread = notifications.filter((n: { read: boolean }) => !n.read).length

  useClickOutside(notifRef, () => setShowNotifs(false))
  useClickOutside(profileRef, () => setShowProfileMenu(false))

  const handleLogout = () => {
    setShowProfileMenu(false)
    logout()
    navigate('/login')
  }

  const goToProfile = () => {
    setShowProfileMenu(false)
    navigate('/app/profile')
  }

  return (
    <header className="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
      <button
        type="button"
        className="lg:hidden p-2 rounded-md hover:bg-[var(--color-bg)] shrink-0"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <form
        className="hidden sm:flex flex-1 max-w-lg items-center relative"
        onSubmit={(e) => {
          e.preventDefault()
          const q = searchQuery.trim()
          if (q) navigate(`/app/deals?search=${encodeURIComponent(q)}`)
        }}
      >
        <Search className="absolute left-3 w-4 h-4 text-[var(--color-muted)] pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search deals by customer…"
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-input-bg)] text-[var(--color-input-text)] placeholder:text-[var(--color-input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20 focus:border-[var(--color-brand)]"
        />
      </form>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-[var(--color-bg)] text-[var(--color-muted)]"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <span
          className={cn(
            'hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
            roleBadgeClass(user.role),
          )}
        >
          {formatRole(user.role)}
        </span>

        <div className="w-px h-6 bg-[var(--color-border)] hidden md:block" />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative p-2 rounded-md hover:bg-[var(--color-bg)] text-[var(--color-muted)] hover:text-[var(--color-text)] transition-colors"
            onClick={() => {
              setShowNotifs((v) => !v)
              setShowProfileMenu(false)
            }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[var(--color-danger)] text-[var(--color-on-brand)] text-[10px] font-medium rounded-full flex items-center justify-center ring-2 ring-[var(--color-surface)]">
                {unread}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)] font-medium text-sm">Notifications</div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[var(--color-muted)] text-center">No notifications yet</p>
                ) : (
                  notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-4 py-3 text-sm border-b border-[var(--color-border)] hover:bg-[var(--color-table-header-bg)] transition-colors',
                      !n.read && 'bg-[var(--color-brand-light)]/30',
                    )}
                    onClick={() => {
                      markNotificationRead(n.id)
                      if (n.quoteId) {
                        setShowNotifs(false)
                        const tab = /submitted a|change request/i.test(n.message) ? 'changes' : 'quote'
                        navigate(`/app/deals/${n.quoteId}${tab === 'quote' ? '' : `?tab=${tab}`}`)
                      }
                    }}
                  >
                    <p className="text-[var(--color-text)]">{n.message}</p>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5">{new Date(n.time).toLocaleTimeString()}</p>
                  </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex items-center" ref={profileRef}>
          <Link
            to="/app/profile"
            className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-l-md hover:bg-[var(--color-bg)] transition-colors"
            onClick={() => setShowProfileMenu(false)}
          >
            <div className="w-8 h-8 rounded-full bg-[var(--color-brand)] text-[var(--color-on-brand)] text-sm flex items-center justify-center font-medium shrink-0">
              {user.name.charAt(0)}
            </div>
            <span className="hidden md:block text-sm font-medium text-[var(--color-text)] max-w-[140px] truncate">
              {user.name}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((v) => !v)
              setShowNotifs(false)
            }}
            className="p-1.5 rounded-r-md hover:bg-[var(--color-bg)] text-[var(--color-muted)] transition-colors"
            aria-label="Account options"
            aria-expanded={showProfileMenu}
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', showProfileMenu && 'rotate-180')} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--color-border)]">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-[var(--color-muted)] truncate">{user.email}</p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={goToProfile}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                >
                  <User className="w-4 h-4 text-[var(--color-muted)]" />
                  My profile
                </button>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false)
                      navigate('/app/settings')
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text)] hover:bg-[var(--color-bg)] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[var(--color-muted)]" />
                    Settings
                  </button>
                )}
              </div>
              <div className="border-t border-[var(--color-border)] py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-bg)] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { toast } = useApp()

  return (
    <div className="flex h-screen bg-[var(--color-bg)]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 bg-[var(--color-surface-raised)] text-[var(--color-text)] border border-[var(--color-border)] text-sm rounded-md shadow-lg animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}
