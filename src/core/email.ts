import nodemailer from 'nodemailer'

/** Hardcoded SMTP — replace via .env in production */
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER ?? 'dealflow.demo@gmail.com',
    pass: process.env.SMTP_PASS ?? 'demo-smtp-password-replace-me',
  },
}

const transporter = nodemailer.createTransport(SMTP_CONFIG)

export async function sendEmail(options: {
  to: string
  subject: string
  text: string
  html?: string
}) {
  return transporter.sendMail({
    from: process.env.SMTP_FROM ?? 'DealFlow360 <noreply@dealflow360.local>',
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html ?? options.text,
  })
}

export async function sendWelcomeEmail(to: string, name: string) {
  return sendEmail({
    to,
    subject: 'Welcome to DealFlow360',
    text: `Hi ${name},\n\nYour DealFlow360 account has been created. You can now log in and start managing governed sales workflows.\n\n— DealFlow360`,
  })
}
