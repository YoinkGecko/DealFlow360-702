export type Role = "ADMIN" | "SALES_REP" | "SALES_MANAGER" | "FINANCE" | "CUSTOMER"
export type Tier = "BRONZE" | "SILVER" | "GOLD"
export type Category = "HARDWARE" | "SOFTWARE" | "SERVICES" | "SUBSCRIPTION"
export type QuoteStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "SENT"
  | "CONFIRMED"

export type Product = {
  id: string
  name: string
  category: Category
  unit: string
  cost: number
  price: number
  taxRate: number
}

export type Customer = {
  id: string
  name: string
  email: string
  tier: Tier
  discountCap: number
}

export type QuoteLine = {
  productId: string
  quantity: number
  discountPercent: number
}

export type Quote = {
  id: string
  number: string
  customerId: string
  status: QuoteStatus
  updatedAt: string
  lines: QuoteLine[]
}

export const customers: Customer[] = [
  {
    id: "c1",
    name: "Acme Technologies",
    email: "procurement@acmetech.com",
    tier: "GOLD",
    discountCap: 15,
  },
  {
    id: "c2",
    name: "Nova Retail",
    email: "buying@novaretail.com",
    tier: "SILVER",
    discountCap: 10,
  },
  {
    id: "c3",
    name: "BlueSky Solutions",
    email: "sales@bluesky.com",
    tier: "BRONZE",
    discountCap: 5,
  },
]

export const products: Product[] = [
  {
    id: "p1",
    name: "Business Laptop Pro",
    category: "HARDWARE",
    unit: "unit",
    cost: 70000,
    price: 100000,
    taxRate: 18,
  },
  {
    id: "p2",
    name: "Enterprise Monitor 27\"",
    category: "HARDWARE",
    unit: "unit",
    cost: 18000,
    price: 28000,
    taxRate: 18,
  },
  {
    id: "p3",
    name: "Mechanical Keyboard",
    category: "HARDWARE",
    unit: "unit",
    cost: 5000,
    price: 8000,
    taxRate: 18,
  },
  {
    id: "p4",
    name: "CRM Enterprise License",
    category: "SOFTWARE",
    unit: "license",
    cost: 25000,
    price: 50000,
    taxRate: 18,
  },
  {
    id: "p5",
    name: "Implementation Service",
    category: "SERVICES",
    unit: "hour",
    cost: 2500,
    price: 5000,
    taxRate: 18,
  },
  {
    id: "p6",
    name: "Premium Support",
    category: "SERVICES",
    unit: "hour",
    cost: 1500,
    price: 3500,
    taxRate: 18,
  },
  {
    id: "p7",
    name: "CRM Pro Monthly",
    category: "SUBSCRIPTION",
    unit: "month",
    cost: 2000,
    price: 5000,
    taxRate: 18,
  },
  {
    id: "p8",
    name: "CRM Pro Annual",
    category: "SUBSCRIPTION",
    unit: "year",
    cost: 20000,
    price: 50000,
    taxRate: 18,
  },
]

export const categoryCaps: Record<Tier, Record<Category, number>> = {
  GOLD: { HARDWARE: 15, SOFTWARE: 15, SERVICES: 10, SUBSCRIPTION: 15 },
  SILVER: { HARDWARE: 10, SOFTWARE: 10, SERVICES: 8, SUBSCRIPTION: 10 },
  BRONZE: { HARDWARE: 5, SOFTWARE: 5, SERVICES: 5, SUBSCRIPTION: 5 },
}

export const quotes: Quote[] = [
  {
    id: "q1",
    number: "Q-1042",
    customerId: "c1",
    status: "PENDING_APPROVAL",
    updatedAt: "2026-09-04",
    lines: [
      { productId: "p1", quantity: 2, discountPercent: 12 },
      { productId: "p5", quantity: 8, discountPercent: 18 },
    ],
  },
  {
    id: "q2",
    number: "Q-1039",
    customerId: "c2",
    status: "DRAFT",
    updatedAt: "2026-09-03",
    lines: [{ productId: "p2", quantity: 6, discountPercent: 8 }],
  },
  {
    id: "q3",
    number: "Q-1035",
    customerId: "c3",
    status: "APPROVED",
    updatedAt: "2026-09-01",
    lines: [{ productId: "p8", quantity: 1, discountPercent: 5 }],
  },
  {
    id: "q4",
    number: "Q-1030",
    customerId: "c1",
    status: "CONFIRMED",
    updatedAt: "2026-08-28",
    lines: [
      { productId: "p4", quantity: 4, discountPercent: 10 },
      { productId: "p7", quantity: 12, discountPercent: 0 },
    ],
  },
]
