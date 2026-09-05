import type { Category, Product, Quote, QuoteLine, QuoteStatus, Tier } from "./mock"
import { categoryCaps, customers, products } from "./mock"

export function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function productById(id: string): Product {
  const found = products.find((item) => item.id === id)
  if (!found) {
    throw new Error(`Unknown product ${id}`)
  }
  return found
}

export function customerById(id: string) {
  const found = customers.find((item) => item.id === id)
  if (!found) {
    throw new Error(`Unknown customer ${id}`)
  }
  return found
}

export function lineSold(product: Product, quantity: number, discountPercent: number) {
  return product.price * quantity * (1 - discountPercent / 100)
}

export function lineCost(product: Product, quantity: number) {
  return product.cost * quantity
}

export function lineMarginPct(sold: number, cost: number) {
  if (sold <= 0) {
    return 0
  }
  return ((sold - cost) / sold) * 100
}

export function quoteTotals(quote: Quote) {
  return totalsForLines(quote.lines)
}

export function totalsForLines(lines: QuoteLine[]) {
  const sold = lines.reduce((sum, line) => {
    const product = productById(line.productId)
    return sum + lineSold(product, line.quantity, line.discountPercent)
  }, 0)
  const cost = lines.reduce((sum, line) => {
    const product = productById(line.productId)
    return sum + lineCost(product, line.quantity)
  }, 0)
  return {
    sold,
    cost,
    marginPct: lineMarginPct(sold, cost),
  }
}

export function overage(tier: Tier, category: Category, discountPercent: number) {
  const cap = categoryCaps[tier][category]
  return Math.max(0, discountPercent - cap)
}

export function statusLabel(status: QuoteStatus) {
  switch (status) {
    case "DRAFT":
      return "Draft"
    case "PENDING_APPROVAL":
      return "Pending"
    case "APPROVED":
      return "Approved"
    case "REJECTED":
      return "Rejected"
    case "SENT":
      return "Sent"
    case "CONFIRMED":
      return "Confirmed"
  }
}
