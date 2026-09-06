/**
 * Portal magic-link tokens are short-lived JWTs scoped to a single quoteId + customerId.
 */

import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js'
import {
  buildQuotationEmailHtml,
  buildQuotationEmailText,
  type QuotationEmailContext,
} from './quotation-email.js'

export const PORTAL_TOKEN_TYPE = 'portal'

export function buildPortalMagicLink(token: string): string {
  const base = (process.env.PORTAL_BASE_URL ?? 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/portal/quote/${token}`
}

function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
}

function normalizeSmtpPassword(password: string): string {
  return password.replace(/\s+/g, '')
}

function createSmtpTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: normalizeSmtpPassword(process.env.SMTP_PASS ?? ''),
    },
  } as SMTPTransport.Options)
}

/**
 * Sends a sales-style quotation email with portal magic link via Nodemailer (SMTP_* env vars).
 */
export async function sendQuotationPortalEmail(
  to: string,
  ctx: QuotationEmailContext,
): Promise<boolean> {
  if (!isSmtpConfigured()) {
    return false
  }

  const from =
    process.env.SMTP_FROM ??
    (process.env.SMTP_USER ? `DealFlow360 <${process.env.SMTP_USER}>` : 'DealFlow360 <noreply@dealflow360.local>')

  try {
    const transport = createSmtpTransport()
    await transport.sendMail({
      from,
      to,
      subject: `Quotation for ${ctx.customerName} — ${ctx.quoteRef}`,
      text: buildQuotationEmailText(ctx),
      html: buildQuotationEmailHtml(ctx),
    })
    console.log(`[portal] Quotation email sent to ${to}`)
    return true
  } catch (err) {
    console.warn('[portal] Failed to send quotation email (falling back to console link):', err)
    return false
  }
}

/** @deprecated Use sendQuotationPortalEmail */
export async function sendMagicLinkEmail(
  to: string,
  link: string,
  quoteSummary: string,
): Promise<boolean> {
  return sendQuotationPortalEmail(to, {
    customerName: 'Customer',
    lines: [],
    totalAmount: 0,
    validUntil: '—',
    salesRepName: 'Sales Team',
    companyName: process.env.COMPANY_NAME ?? 'DealFlow360',
    phone: process.env.COMPANY_PHONE ?? '',
    email: process.env.SMTP_USER ?? '',
    portalLink: link,
    quoteRef: quoteSummary,
  })
}
