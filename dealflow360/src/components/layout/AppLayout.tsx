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
    sales_rep: 'bg-[#e3f2fd] text-[#1565C0]',
    manager: 'bg-[#fff3e0] text-[#e65100]',
    finance: 'bg-[#f3e5f5] text-[#7b1fa2]',
    admin: 'bg-[#e8f5e9] text-[#2e7d32]',
    customer: 'bg-[#f5f6f8] text-[#6b7280]',
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
  { path: '/app/fulfillment', label: 'Fulfillment', icon: Truck, roles: ['manager', 'finance', 'admin'] },
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
        ? 'bg-[#e3f2fd] text-[#1565C0] font-medium'
        : 'text-[#6b7280] hover:bg-[#f5f6f8] hover:text-[#1a1d21]',
    )

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-50 w-60 bg-white border-r border-[#e8eaed] flex flex-col h-full',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 transition-transform',
        )}
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-[#e8eaed]">
          <Link to="/app" className="flex items-center gap-2" onClick={onClose}>
            <div className="w-7 h-7 rounded bg-[#1565C0] flex items-center justify-center text-white text-xs font-bold">DF</div>
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
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af]">Administration</p>
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

        <div className="p-3 border-t border-[#e8eaed] space-y-0.5">
          <Link to="/app/help" className={linkClass('/app/help')} onClick={onClose}>
            <HelpCircle className="w-4 h-4" />
            Help
          </Link>
          <Link to="/app/profile" className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[#f5f6f8] transition-colors" onClick={onClose}>
            <div className="w-7 h-7 rounded-full bg-[#1565C0] text-white text-xs flex items-center justify-center font-medium">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-[#6b7280] truncate">{formatRole(user.role)}</p>
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
  const { user, notifications, markNotificationRead } = useApp()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
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
    <header className="h-14 bg-white border-b border-[#e8eaed] flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-30">
      <button
        type="button"
        className="lg:hidden p-2 rounded-md hover:bg-[#f5f6f8] shrink-0"
        onClick={onMenuClick}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden sm:flex flex-1 max-w-lg items-center relative">
        <Search className="absolute left-3 w-4 h-4 text-[#9ca3af] pointer-events-none" />
        <input
          type="search"
          placeholder="Search deals, customers, invoices..."
          className="w-full pl-9 pr-3 py-1.5 text-sm border border-[#e8eaed] rounded-md bg-[#fafbfc] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20 focus:border-[#1565C0]"
        />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
        <span
          className={cn(
            'hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
            roleBadgeClass(user.role),
          )}
        >
          {formatRole(user.role)}
        </span>

        <div className="w-px h-6 bg-[#e8eaed] hidden md:block" />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="relative p-2 rounded-md hover:bg-[#f5f6f8] text-[#6b7280] hover:text-[#1a1d21] transition-colors"
            onClick={() => {
              setShowNotifs((v) => !v)
              setShowProfileMenu(false)
            }}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#c62828] text-white text-[10px] font-medium rounded-full flex items-center justify-center ring-2 ring-white">
                {unread}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#e8eaed] rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e8eaed] font-medium text-sm">Notifications</div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((n: { id: string; message: string; time: string; read: boolean }) => (
                  <button
                    key={n.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-4 py-3 text-sm border-b border-[#e8eaed] hover:bg-[#fafbfc] transition-colors',
                      !n.read && 'bg-[#e3f2fd]/30',
                    )}
                    onClick={() => markNotificationRead(n.id)}
                  >
                    <p className="text-[#1a1d21]">{n.message}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">{new Date(n.time).toLocaleTimeString()}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative flex items-center" ref={profileRef}>
          <Link
            to="/app/profile"
            className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-l-md hover:bg-[#f5f6f8] transition-colors"
            onClick={() => setShowProfileMenu(false)}
          >
            <div className="w-8 h-8 rounded-full bg-[#1565C0] text-white text-sm flex items-center justify-center font-medium shrink-0">
              {user.name.charAt(0)}
            </div>
            <span className="hidden md:block text-sm font-medium text-[#1a1d21] max-w-[140px] truncate">
              {user.name}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((v) => !v)
              setShowNotifs(false)
            }}
            className="p-1.5 rounded-r-md hover:bg-[#f5f6f8] text-[#6b7280] transition-colors"
            aria-label="Account options"
            aria-expanded={showProfileMenu}
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', showProfileMenu && 'rotate-180')} />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#e8eaed] rounded-lg shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e8eaed]">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  onClick={goToProfile}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#1a1d21] hover:bg-[#f5f6f8] transition-colors"
                >
                  <User className="w-4 h-4 text-[#6b7280]" />
                  My profile
                </button>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false)
                      navigate('/app/settings')
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#1a1d21] hover:bg-[#f5f6f8] transition-colors"
                  >
                    <Settings className="w-4 h-4 text-[#6b7280]" />
                    Settings
                  </button>
                )}
              </div>
              <div className="border-t border-[#e8eaed] py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-[#c62828] hover:bg-[#ffebee] transition-colors"
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
    <div className="flex h-screen bg-[#f5f6f8]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 bg-[#1a1d21] text-white text-sm rounded-md shadow-lg animate-in">
          {toast}
        </div>
      )}
    </div>
  )
}
