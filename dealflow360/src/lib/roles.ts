import type { UserRole } from '../data/mock'

export function canDecideApprovals(role: UserRole): boolean {
  return role === 'manager' || role === 'finance' || role === 'admin'
}

export function canAllocateFulfillment(role: UserRole): boolean {
  return role === 'sales_rep' || role === 'manager' || role === 'admin'
}

export function canRespondToChangeRequests(role: UserRole): boolean {
  return role === 'sales_rep' || role === 'admin'
}

export function canCreateQuote(role: UserRole): boolean {
  return role === 'sales_rep' || role === 'admin'
}

export function canSendToCustomer(role: UserRole): boolean {
  return role === 'sales_rep' || role === 'admin'
}

export function canManageBilling(role: UserRole): boolean {
  return role === 'sales_rep' || role === 'finance' || role === 'admin'
}

export function approvalRoleMatchesUser(approverRole: string, userRole: UserRole): boolean {
  if (userRole === 'admin') return true
  const map: Record<UserRole, string | null> = {
    sales_rep: null,
    manager: 'MANAGER',
    finance: 'FINANCE',
    admin: 'ADMIN',
    customer: null,
  }
  return map[userRole] === approverRole
}
