import { useApp } from '../context/AppContext'
import { can, type Permission } from '../lib/permissions'

export function usePermission(permission: Permission): boolean {
  const { user } = useApp()
  return can(user.role, permission)
}
