import type { CustomerTier, ProductCategory, QuoteLine } from '../lib/risk'

export type UserRole = 'sales_rep' | 'manager' | 'finance' | 'admin' | 'customer'
export type DealStage =
  | 'draft'
  | 'negotiation'
  | 'pending_approval'
  | 'approved'
  | 'fulfillment'
  | 'billed'
  | 'paid'
  | 'rejected'

export interface Deal {
  id: string
  customer: string
  customerId: string
  owner: string
  tier: CustomerTier
  stage: DealStage
  amount: number
  discount: number
  risk: number
  riskLevel: 'low' | 'medium' | 'high'
  approval: string
  lastUpdated: string
  lines: QuoteLine[]
  currency: string
  quoteDate: string
  expiry: string
}

export interface Customer {
  id: string
  name: string
  tier: CustomerTier
  industry: string
  activeDeals: number
  lifetimeValue: number
  outstandingBalance: number
  lastActivity: string
  status: 'active' | 'inactive'
}

export interface Product {
  id: string
  name: string
  sku: string
  category: ProductCategory
  price: number
  margin: number
  stock: number
  subscription: boolean
  status: 'active' | 'archived'
  cost: number
}

export interface Warehouse {
  id: string
  name: string
  city: string
  utilization: number
  availableUnits: number
  pendingOrders: number
  shippingCost: number
  stock: Record<string, number>
}

export interface Invoice {
  id: string
  customer: string
  type: 'one-time' | 'recurring' | 'prorated' | 'credit'
  amount: number
  dueDate: string
  status: 'paid' | 'unpaid' | 'overdue' | 'partial'
}

export interface Subscription {
  id: string
  customer: string
  plan: string
  seats: number
  mrr: number
  startDate: string
  renewalDate: string
  status: 'active' | 'paused' | 'cancelled'
  unitPrice: number
  billingCycleDays: number
  daysRemaining: number
}

export interface AuditEvent {
  id: string
  timestamp: string
  actor: string
  event: string
  aggregate: string
  details: string
}

export interface Notification {
  id: string
  message: string
  time: string
  read: boolean
  type: 'approval' | 'fulfillment' | 'billing' | 'health'
}

export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'CRM Platform Enterprise', sku: 'CRM-ENT', category: 'Software', price: 480000, margin: 68, stock: 999, subscription: false, status: 'active', cost: 153600 },
  { id: 'p2', name: 'Analytics Module', sku: 'ANL-PRO', category: 'Software', price: 180000, margin: 72, stock: 999, subscription: false, status: 'active', cost: 50400 },
  { id: 'p3', name: 'Implementation Services', sku: 'SRV-IMP', category: 'Services', price: 320000, margin: 42, stock: 0, subscription: false, status: 'active', cost: 185600 },
  { id: 'p4', name: 'Laptop Pro 14', sku: 'HW-LP14', category: 'Hardware', price: 98000, margin: 22, stock: 145, subscription: false, status: 'active', cost: 76440 },
  { id: 'p5', name: 'Care Plan 2yr', sku: 'SUB-CP2', category: 'Subscription', price: 5000, margin: 55, stock: 999, subscription: true, status: 'active', cost: 2250 },
  { id: 'p6', name: 'Support SLA Gold', sku: 'SUB-SLA', category: 'Subscription', price: 25000, margin: 48, stock: 999, subscription: true, status: 'active', cost: 13000 },
  { id: 'p7', name: 'Docking Station', sku: 'HW-DOCK', category: 'Hardware', price: 14500, margin: 28, stock: 210, subscription: false, status: 'active', cost: 10440 },
  { id: 'p8', name: 'Onsite Setup', sku: 'SRV-SET', category: 'Services', price: 45000, margin: 38, stock: 0, subscription: false, status: 'active', cost: 27900 },
]

export const INITIAL_DEAL_LINES: QuoteLine[] = [
  { id: 'l1', productId: 'p1', productName: 'CRM Platform Enterprise', category: 'Software', quantity: 1, unitPrice: 480000, discount: 20, cost: 153600 },
  { id: 'l2', productId: 'p3', productName: 'Implementation Services', category: 'Services', quantity: 1, unitPrice: 320000, discount: 15, cost: 185600 },
  { id: 'l3', productId: 'p5', productName: 'Care Plan 2yr', category: 'Subscription', quantity: 10, unitPrice: 5000, discount: 5, cost: 2250 },
]

export const DEALS: Deal[] = [
  {
    id: 'DF-1042',
    customer: 'Acme Corporation',
    customerId: 'c1',
    owner: 'Alex Rao',
    tier: 'Gold',
    stage: 'pending_approval',
    amount: 712500,
    discount: 16.2,
    risk: 18.4,
    riskLevel: 'high',
    approval: 'Manager + Finance',
    lastUpdated: new Date(Date.now() - 2 * 60000).toISOString(),
    lines: INITIAL_DEAL_LINES,
    currency: 'INR',
    quoteDate: '2026-03-01',
    expiry: '2026-03-31',
  },
  {
    id: 'DF-1039',
    customer: 'Beta Industries',
    customerId: 'c2',
    owner: 'Priya Mehta',
    tier: 'Silver',
    stage: 'negotiation',
    amount: 2890000,
    discount: 12.4,
    risk: 9.2,
    riskLevel: 'medium',
    approval: 'Manager',
    lastUpdated: new Date(Date.now() - 45 * 60000).toISOString(),
    lines: [],
    currency: 'INR',
    quoteDate: '2026-02-28',
    expiry: '2026-03-28',
  },
  {
    id: 'DF-1035',
    customer: 'Nova Retail',
    customerId: 'c3',
    owner: 'Alex Rao',
    tier: 'Gold',
    stage: 'approved',
    amount: 975000,
    discount: 8.1,
    risk: 0,
    riskLevel: 'low',
    approval: 'Auto-approved',
    lastUpdated: new Date(Date.now() - 3 * 3600000).toISOString(),
    lines: [],
    currency: 'INR',
    quoteDate: '2026-02-25',
    expiry: '2026-03-25',
  },
  {
    id: 'DF-1030',
    customer: 'Zenith Co',
    customerId: 'c4',
    owner: 'Rahul Verma',
    tier: 'Bronze',
    stage: 'draft',
    amount: 1530000,
    discount: 6.5,
    risk: 2.1,
    riskLevel: 'low',
    approval: '—',
    lastUpdated: new Date(Date.now() - 9 * 86400000).toISOString(),
    lines: [],
    currency: 'INR',
    quoteDate: '2026-02-20',
    expiry: '2026-03-20',
  },
  {
    id: 'DF-1028',
    customer: 'Delta LLC',
    customerId: 'c5',
    owner: 'Alex Rao',
    tier: 'Silver',
    stage: 'fulfillment',
    amount: 320000,
    discount: 21,
    risk: 24.6,
    riskLevel: 'high',
    approval: 'Approved',
    lastUpdated: new Date(Date.now() - 8 * 60000).toISOString(),
    lines: [],
    currency: 'INR',
    quoteDate: '2026-02-18',
    expiry: '2026-03-18',
  },
  {
    id: 'DF-1021',
    customer: 'Orion Ltd',
    customerId: 'c6',
    owner: 'Priya Mehta',
    tier: 'Gold',
    stage: 'paid',
    amount: 4100000,
    discount: 11.2,
    risk: 5.4,
    riskLevel: 'low',
    approval: 'Approved',
    lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
    lines: [],
    currency: 'INR',
    quoteDate: '2026-02-01',
    expiry: '2026-03-01',
  },
]

export const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Acme Corporation', tier: 'Gold', industry: 'Manufacturing', activeDeals: 3, lifetimeValue: 12400000, outstandingBalance: 712500, lastActivity: new Date(Date.now() - 2 * 60000).toISOString(), status: 'active' },
  { id: 'c2', name: 'Beta Industries', tier: 'Silver', industry: 'Technology', activeDeals: 2, lifetimeValue: 8900000, outstandingBalance: 0, lastActivity: new Date(Date.now() - 45 * 60000).toISOString(), status: 'active' },
  { id: 'c3', name: 'Nova Retail', tier: 'Gold', industry: 'Retail', activeDeals: 1, lifetimeValue: 5600000, outstandingBalance: 0, lastActivity: new Date(Date.now() - 3 * 3600000).toISOString(), status: 'active' },
  { id: 'c4', name: 'Zenith Co', tier: 'Bronze', industry: 'Logistics', activeDeals: 1, lifetimeValue: 2100000, outstandingBalance: 0, lastActivity: new Date(Date.now() - 9 * 86400000).toISOString(), status: 'active' },
  { id: 'c5', name: 'Delta LLC', tier: 'Silver', industry: 'Healthcare', activeDeals: 2, lifetimeValue: 3400000, outstandingBalance: 320000, lastActivity: new Date(Date.now() - 8 * 60000).toISOString(), status: 'active' },
  { id: 'c6', name: 'Orion Ltd', tier: 'Gold', industry: 'Finance', activeDeals: 0, lifetimeValue: 18200000, outstandingBalance: 0, lastActivity: new Date(Date.now() - 2 * 86400000).toISOString(), status: 'active' },
]

export const WAREHOUSES: Warehouse[] = [
  { id: 'w1', name: 'Delhi DC', city: 'Delhi', utilization: 78, availableUnits: 1240, pendingOrders: 18, shippingCost: 420, stock: { 'HW-LP14': 40, 'HW-DOCK': 65 } },
  { id: 'w2', name: 'Mumbai DC', city: 'Mumbai', utilization: 65, availableUnits: 980, pendingOrders: 12, shippingCost: 380, stock: { 'HW-LP14': 35, 'HW-DOCK': 48 } },
  { id: 'w3', name: 'Pune DC', city: 'Pune', utilization: 52, availableUnits: 720, pendingOrders: 8, shippingCost: 350, stock: { 'HW-LP14': 25, 'HW-DOCK': 42 } },
  { id: 'w4', name: 'Bangalore DC', city: 'Bangalore', utilization: 71, availableUnits: 1100, pendingOrders: 15, shippingCost: 400, stock: { 'HW-LP14': 45, 'HW-DOCK': 55 } },
]

export const INVOICES: Invoice[] = [
  { id: 'INV-1042', customer: 'Acme Corporation', type: 'one-time', amount: 712500, dueDate: '2026-03-10', status: 'unpaid' },
  { id: 'INV-1043', customer: 'Acme Corporation', type: 'recurring', amount: 47500, dueDate: '2026-03-15', status: 'paid' },
  { id: 'INV-1038', customer: 'Nova Retail', type: 'one-time', amount: 975000, dueDate: '2026-02-28', status: 'paid' },
  { id: 'INV-1035', customer: 'Delta LLC', type: 'one-time', amount: 320000, dueDate: '2026-03-05', status: 'overdue' },
  { id: 'INV-1030', customer: 'Orion Ltd', type: 'prorated', amount: 12500, dueDate: '2026-02-20', status: 'paid' },
]

export const SUBSCRIPTIONS: Subscription[] = [
  { id: 's1', customer: 'Acme Corporation', plan: 'Enterprise', seats: 10, mrr: 50000, startDate: '2025-09-15', renewalDate: '2026-03-15', status: 'active', unitPrice: 5000, billingCycleDays: 30, daysRemaining: 18 },
  { id: 's2', customer: 'Beta Industries', plan: 'Support SLA Gold', seats: 5, mrr: 125000, startDate: '2025-11-01', renewalDate: '2026-04-01', status: 'active', unitPrice: 25000, billingCycleDays: 90, daysRemaining: 42 },
  { id: 's3', customer: 'Delta LLC', plan: 'Care Plan 1yr', seats: 3, mrr: 15000, startDate: '2025-08-01', renewalDate: '—', status: 'paused', unitPrice: 5000, billingCycleDays: 30, daysRemaining: 0 },
]

export const INITIAL_AUDIT: AuditEvent[] = [
  { id: 'e1', timestamp: '2026-03-05T10:32:14', actor: 'Alex Rao', event: 'QUOTE_CREATED', aggregate: 'DF-1042', details: 'Quote created for Acme Corporation' },
  { id: 'e2', timestamp: '2026-03-05T10:32:18', actor: 'System', event: 'RISK_CALCULATED', aggregate: 'DF-1042', details: 'Blended risk: 18.4% — HIGH' },
  { id: 'e3', timestamp: '2026-03-05T10:32:19', actor: 'System', event: 'APPROVAL_REQUESTED', aggregate: 'DF-1042', details: 'Route: Sales Manager → Finance' },
  { id: 'e4', timestamp: '2026-03-05T10:35:02', actor: 'Sarah Kapoor', event: 'MANAGER_APPROVED', aggregate: 'DF-1042', details: 'Approved with margin note attached' },
  { id: 'e5', timestamp: '2026-03-05T10:41:22', actor: 'System', event: 'WAREHOUSE_ALLOCATED', aggregate: 'DF-1028', details: 'Delhi 40 + Mumbai 35 + Pune 25 units' },
  { id: 'e6', timestamp: '2026-03-05T10:44:08', actor: 'System', event: 'PRORATION_CALCULATED', aggregate: 's1', details: 'Seat increase 10→15: ₹30,000 prorated' },
]

export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', message: 'Deal DF-1042 requires Finance approval.', time: new Date(Date.now() - 3 * 60000).toISOString(), read: false, type: 'approval' },
  { id: 'n2', message: 'Warehouse allocation completed for DF-1028.', time: new Date(Date.now() - 8 * 60000).toISOString(), read: false, type: 'fulfillment' },
  { id: 'n3', message: 'Subscription change generated a prorated charge of ₹30,000.', time: new Date(Date.now() - 15 * 60000).toISOString(), read: true, type: 'billing' },
  { id: 'n4', message: 'Deal DF-1030 has been stalled for 9 days.', time: new Date(Date.now() - 60 * 60000).toISOString(), read: true, type: 'health' },
]

export const RECOMMENDATIONS = [
  { product: 'CRM Platform Enterprise', recommended: 'Analytics Module', lift: 2.8, margin: 42, confidence: 'High', reason: 'Frequently purchased together by similar customers in Manufacturing.' },
  { product: 'Laptop Pro 14', recommended: 'Docking Station', lift: 3.2, margin: 28, confidence: 'High', reason: 'Co-purchase rate 3.2× above baseline in Hardware category.' },
  { product: 'CRM Platform Enterprise', recommended: 'Care Plan 2yr', lift: 2.1, margin: 55, confidence: 'Medium', reason: 'Active promotion — margin-positive attach rate.' },
]

export const PIPELINE_STAGES = [
  { stage: 'Draft', count: 4, value: 4200000 },
  { stage: 'Negotiation', count: 3, value: 6100000 },
  { stage: 'Pending Approval', count: 2, value: 3600000 },
  { stage: 'Approved', count: 5, value: 8900000 },
  { stage: 'Fulfillment', count: 2, value: 1800000 },
  { stage: 'Billed', count: 6, value: 7200000 },
  { stage: 'Paid', count: 8, value: 15400000 },
]
