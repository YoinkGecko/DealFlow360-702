import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js'

type EmailTransport = 'console' | 'ethereal' | 'smtp'

let transporter: nodemailer.Transporter | null = null

const FROM = process.env.EMAIL_FROM ?? 'DealFlow360 <noreply@dealflow360.local>'

/**
 * Initialize Nodemailer transport (call once at server startup).
 *
 * - console (default): no Gmail/SMTP needed — emails logged to the terminal
 * - ethereal: free test inbox at ethereal.email (needs network)
 * - smtp: real SMTP when you have credentials (set SMTP_* in .env)
 */
export async function initEmailTransport(): Promise<void> {
  const mode = (process.env.EMAIL_TRANSPORT ?? 'console') as EmailTransport

  if (mode === 'smtp') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    } as SMTPTransport.Options)
    console.log('[email] Using SMTP transport')
    return
  }

  if (mode === 'ethereal') {
    const testAccount = await nodemailer.createTestAccount()
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    })
    console.log('[email] Using Ethereal test transport')
    console.log(`[email] Test inbox: ${testAccount.user}`)
    return
  }

  transporter = nodemailer.createTransport({
    jsonTransport: true,
  })
  console.log('[email] Using Nodemailer console transport (no SMTP / Gmail required)')
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    throw new Error('Email transport not initialized — call initEmailTransport() at startup')
  }
  return transporter
}

export async function sendEmail(options: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  const mode = (process.env.EMAIL_TRANSPORT ?? 'console') as EmailTransport
  const info = await getTransporter().sendMail({
    from: FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? options.text,
  })

  if (mode === 'console') {
    console.log('\n[email] ─── Message (console transport) ───')
    console.log(`  To:      ${options.to}`)
    console.log(`  Subject: ${options.subject}`)
    console.log(`  Body:\n${options.text}`)
    console.log('[email] ───────────────────────────────────\n')
  } else if (mode === 'ethereal') {
    const preview = nodemailer.getTestMessageUrl(info)
    if (preview) {
      console.log(`[email] Preview URL: ${preview}`)
    }
  }

  return info
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to DealFlow360',
    text: `Hi ${name},\n\nYour DealFlow360 account has been created. You can now log in and start managing governed sales workflows.\n\n— DealFlow360`,
  })
}
