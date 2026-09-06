import { Navigate, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

export function AuditLogPage() {
  return <Navigate to="/app/deals" replace />
}

export function WhatIfPage() {
  return <Navigate to="/app/deals" replace />
}

export function WarehousesPage() {
  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Warehouses</h1>
      <p className="text-sm text-[var(--color-muted)]">Configure warehouse locations, stock levels, and shipping cost weighting.</p>
      <div className="grid md:grid-cols-2 gap-4">
        {['Delhi DC', 'Mumbai DC', 'Pune DC', 'Bangalore DC'].map((w) => (
          <Card key={w}>
            <h3 className="font-semibold">{w}</h3>
            <p className="text-xs text-[var(--color-muted)] mt-1">Active · Replenishment enabled</p>
            <Button variant="secondary" size="sm" className="mt-3" disabled title="Coming soon">
              Configure
            </Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function SettingsPage() {
  return (
    <div className="space-y-4 animate-in">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card>
        <h3 className="font-semibold text-sm mb-4">Organization</h3>
        <div className="space-y-3 max-w-md">
          <div><label className="text-sm">Company Name</label><input className="mt-1 w-full px-3 py-2 border rounded-md text-sm" value="Acme Sales India Pvt Ltd" readOnly /></div>
          <div><label className="text-sm">Default Currency</label><input className="mt-1 w-full px-3 py-2 border rounded-md text-sm" value="INR" readOnly /></div>
        </div>
      </Card>
    </div>
  )
}

export function HelpPage() {
  return (
    <Card className="animate-in">
      <h1 className="text-xl font-semibold">Help & Documentation</h1>
      <p className="text-sm text-[var(--color-muted)] mt-2">DealFlow360 documentation and support resources.</p>
      <ul className="mt-4 space-y-2 text-sm">
        <li>• Getting started with discount governance</li>
        <li>• Configuring approval chains</li>
        <li>• Warehouse allocation rules</li>
        <li>• Subscription proration explained</li>
      </ul>
    </Card>
  )
}

export function ProfilePage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { user } = useApp()

  const roleLabels: Record<string, string> = {
    sales_rep: 'Sales Rep',
    manager: 'Manager',
    finance: 'Finance',
    admin: 'Admin',
    customer: 'Customer',
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6 animate-in max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">My Profile</h1>
        <p className="text-sm text-[var(--color-muted)] mt-1">Manage your account information and preferences.</p>
      </div>

      <Card>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-full bg-[var(--color-brand)] text-[var(--color-on-brand)] text-2xl flex items-center justify-center font-semibold shrink-0">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">{user.name}</h2>
            <p className="text-sm text-[var(--color-muted)] truncate">{user.email}</p>
            <span className="inline-flex mt-2 items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-success-bg)] text-[var(--color-success)]">
              {roleLabels[user.role]}
            </span>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Account details</h3>
        <div className="space-y-4 max-w-md">
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Full name</label>
            <p className="mt-1 text-sm text-[var(--color-text)]">{user.name}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Email</label>
            <p className="mt-1 text-sm text-[var(--color-text)]">{user.email}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">Role</label>
            <p className="mt-1 text-sm text-[var(--color-text)]">{roleLabels[user.role]}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--color-muted)] uppercase tracking-wide">User ID</label>
            <p className="mt-1 text-sm text-[var(--color-text)] font-mono text-xs break-all">{user.id}</p>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-2">Session</h3>
        <p className="text-sm text-[var(--color-muted)] mb-4">Sign out of DealFlow360 on this device.</p>
        <Button variant="secondary" onClick={handleLogout} className="text-[var(--color-danger)] border-[var(--color-danger)] hover:bg-[var(--color-danger-bg)]">
          <LogOut className="w-4 h-4 mr-2 inline" />
          Sign out
        </Button>
      </Card>
    </div>
  )
}
