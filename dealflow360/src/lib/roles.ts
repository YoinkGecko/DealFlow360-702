import type { UserRole } from '../data/mock'
import { can } from './permissions'
export function canDecideApprovals(role: UserRole): boolean {
  return can(role, 'approval.decide')
}

export function canAllocateFulfillment(role: UserRole): boolean {
  return can(role, 'fulfillment.allocate')
}

export function canRespondToChangeRequests(role: UserRole): boolean {
  return can(role, 'changeRequest.respond')
}

export function canCreateQuote(role: UserRole): boolean {
  return can(role, 'quote.create')
}

export function canSendToCustomer(role: UserRole): boolean {
  return can(role, 'quote.sendToCustomer')
}

export function canManageBilling(role: UserRole): boolean {
  return can(role, 'billing.manage')
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

export { can } from './permissions'
