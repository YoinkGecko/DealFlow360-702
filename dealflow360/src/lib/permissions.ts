import type { UserRole } from '../data/mock'

/** Mirrors backend route role guards — single source of truth for UI action visibility. */
export type Permission =
  | 'quote.create'
  | 'quote.addLine'
  | 'quote.submit'
  | 'quote.sendToCustomer'
  | 'approval.decide'
  | 'changeRequest.respond'
  | 'fulfillment.allocate'
  | 'billing.manage'
  | 'product.create'
  | 'customer.create'
  | 'policy.manage'
  | 'settings.manage'

export const PERMISSION_LABELS: Record<Permission, string> = {
  'quote.create': 'Create deals',
  'quote.addLine': 'Add quote lines',
  'quote.submit': 'Submit quote for approval',
  'quote.sendToCustomer': 'Send quote to customer portal',
  'approval.decide': 'Approve / reject / request changes',
  'changeRequest.respond': 'Respond to customer change requests',
  'fulfillment.allocate': 'Allocate fulfillment',
  'billing.manage': 'Manage subscriptions and billing',
  'product.create': 'Create products',
  'customer.create': 'Create customers',
  'policy.manage': 'Edit pricing policies',
  'settings.manage': 'Admin settings',
}

/** Allowed roles per permission (matches backend requireRoles). */
export const PERMISSION_ROLES: Record<Permission, readonly UserRole[]> = {
  'quote.create': ['sales_rep', 'admin'],
  'quote.addLine': ['sales_rep', 'admin'],
  'quote.submit': ['sales_rep', 'admin'],
  'quote.sendToCustomer': ['sales_rep', 'admin'],
  'approval.decide': ['manager', 'finance', 'admin'],
  'changeRequest.respond': ['sales_rep', 'admin'],
  'fulfillment.allocate': ['sales_rep', 'manager', 'admin'],
  'billing.manage': ['sales_rep', 'finance', 'admin'],
  'product.create': ['admin'],
  'customer.create': ['sales_rep', 'admin'],
  'policy.manage': ['admin'],
  'settings.manage': ['admin'],
}

export function can(role: UserRole, permission: Permission): boolean {
  return PERMISSION_ROLES[permission].includes(role)
}
