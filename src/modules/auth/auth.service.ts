import bcrypt from 'bcryptjs'
import type { UserRole } from '@prisma/client'
import { prisma } from '../../db/client.js'
import { sendWelcomeEmail } from '../../core/email.js'

const INTERNAL_ROLES: UserRole[] = ['REP', 'MANAGER', 'FINANCE', 'ADMIN']

export async function signupUser(data: {
  email: string
  password: string
  name: string
  role: UserRole
}) {
  if (!INTERNAL_ROLES.includes(data.role)) {
    throw Object.assign(new Error('Signup is for internal users only'), { statusCode: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { statusCode: 409 })
  }

  const passwordHash = await bcrypt.hash(data.password, 12)
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      role: data.role,
    },
  })

  try {
    await sendWelcomeEmail(user.email, user.name)
  } catch (err) {
    console.warn('[email] Welcome email failed (signup still succeeded):', err)
  }

  return sanitizeUser(user)
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 })
  }

  return sanitizeUser(user)
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) return null
  return sanitizeUser(user)
}

function sanitizeUser(user: {
  id: string
  email: string
  role: UserRole
  name: string
  createdAt: Date
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    createdAt: user.createdAt,
  }
}
