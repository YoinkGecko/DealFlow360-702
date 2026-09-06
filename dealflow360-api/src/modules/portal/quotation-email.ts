export interface QuotationLineItem {
  productName: string
  quantity: number
  amount: number
}

export interface QuotationEmailContext {
  customerName: string
  lines: QuotationLineItem[]
  totalAmount: number
  validUntil: string
  salesRepName: string
  companyName: string
  phone: string
  email: string
  portalLink: string
  quoteRef: string
}

function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildQuotationEmailHtml(ctx: QuotationEmailContext): string {
  const lineRows = ctx.lines
    .map(
      (line) => `
      <tr>
        <td style="padding:10px; border-bottom:1px solid #eee;">${escapeHtml(line.productName)}</td>
        <td style="padding:10px; text-align:center; border-bottom:1px solid #eee;">${line.quantity}</td>
        <td style="padding:10px; text-align:right; border-bottom:1px solid #eee;">₹${formatInr(line.amount)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quotation</title>
</head>
<body style="margin:0; padding:0; background:#f5f6f8; font-family:Arial, sans-serif; color:#333;">
  <div style="max-width:600px; margin:30px auto; background:#ffffff; padding:30px; border-radius:8px;">
    <h2 style="margin-top:0; color:#222;">Quotation for Your Requirements</h2>
    <p style="font-size:12px; color:#6b7280; margin-bottom:20px;">Reference: ${escapeHtml(ctx.quoteRef)}</p>

    <p>Dear <strong>${escapeHtml(ctx.customerName)}</strong>,</p>

    <p>
      Thank you for your interest in our products and services.
      Please find our quotation based on your requirements below.
    </p>

    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <tr style="background:#f1f3f5;">
        <th style="padding:10px; text-align:left;">Item</th>
        <th style="padding:10px; text-align:center;">Qty</th>
        <th style="padding:10px; text-align:right;">Amount</th>
      </tr>
      ${lineRows}
      <tr>
        <td colspan="2" style="padding:12px; text-align:right;"><strong>Total</strong></td>
        <td style="padding:12px; text-align:right;"><strong>₹${formatInr(ctx.totalAmount)}</strong></td>
      </tr>
    </table>

    <p style="margin:28px 0; text-align:center;">
      <a href="${ctx.portalLink}" style="background:#1565c0; color:#ffffff; padding:14px 28px; text-decoration:none; border-radius:6px; display:inline-block; font-weight:bold;">
        View &amp; Respond to Quotation
      </a>
    </p>

    <p style="font-size:13px; color:#6b7280; text-align:center;">
      This secure link takes you to your customer portal where you can review line items, request changes, or confirm the quote.
      The link expires in 2 hours.
    </p>

    <p>
      The quotation is valid until <strong>${escapeHtml(ctx.validUntil)}</strong>.
      Please let us know if you have any questions or would like to proceed.
    </p>

    <p>
      Best regards,<br>
      <strong>${escapeHtml(ctx.salesRepName)}</strong><br>
      ${escapeHtml(ctx.companyName)}<br>
      ${escapeHtml(ctx.phone)} | ${escapeHtml(ctx.email)}
    </p>
  </div>
</body>
</html>`
}

export function buildQuotationEmailText(ctx: QuotationEmailContext): string {
  const lines = ctx.lines
    .map((l) => `  - ${l.productName} x${l.quantity}: ₹${formatInr(l.amount)}`)
    .join('\n')

  return `Dear ${ctx.customerName},

Thank you for your interest. Please find our quotation (Ref: ${ctx.quoteRef}):

${lines}

Total: ₹${formatInr(ctx.totalAmount)}
Valid until: ${ctx.validUntil}

View and respond online: ${ctx.portalLink}

Best regards,
${ctx.salesRepName}
${ctx.companyName}
${ctx.phone} | ${ctx.email}`
}
