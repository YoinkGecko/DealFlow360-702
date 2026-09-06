/**
 * Portal magic-link tokens are short-lived JWTs scoped to a single quoteId + customerId.
 * They are NOT general-purpose customer login tokens.
 *
 * Token creation and verification live in portal.service.ts (uses Fastify JWT).
 */

export const PORTAL_TOKEN_TYPE = 'portal'

export function buildPortalMagicLink(token: string): string {
  const base = (process.env.PORTAL_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  return `${base}/portal/quote/${token}`
}

/**
 * Sends the portal magic-link email via Resend.
 * Returns true when sent successfully, false when skipped or on failure (caller should fall back).
 */
export async function sendMagicLinkEmail(
  to: string,
  link: string,
  quoteRef: string,
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return false
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'DealFlow360 <onboarding@resend.dev>'

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Access your quote — ${quoteRef}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1d21;">
          <h2 style="color: #1565C0; margin-bottom: 8px;">DealFlow360 Customer Portal</h2>
          <p>You requested access to review your quotation.</p>
          <p><strong>Quote reference:</strong> ${quoteRef}</p>
          <p style="margin: 24px 0;">
            <a href="${link}" style="background: #1565C0; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View your quote
            </a>
          </p>
          <p style="font-size: 13px; color: #6b7280;">This link expires in 2 hours and can only be used for this quote.</p>
          <p style="font-size: 12px; color: #9ca3af;">If the button does not work, copy and paste this URL into your browser:<br>${link}</p>
        </div>
      `,
    })

    if (error) {
      console.warn('[portal] Resend API error (magic link not sent):', error)
      return false
    }

    console.log(`[portal] Magic link email sent to ${to}`)
    return true
  } catch (err) {
    console.warn('[portal] Failed to send magic-link email (falling back to console link):', err)
    return false
  }
}
