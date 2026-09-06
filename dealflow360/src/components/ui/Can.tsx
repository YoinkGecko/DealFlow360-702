import type { ReactNode } from 'react'
import { usePermission } from '../../hooks/usePermission'
import type { Permission } from '../../lib/permissions'

export function Can({
  action,
  children,
  fallback = null,
}: {
  action: Permission
  children: ReactNode
  fallback?: ReactNode
}) {
  const allowed = usePermission(action)
  if (!allowed) return fallback
  return children
}
