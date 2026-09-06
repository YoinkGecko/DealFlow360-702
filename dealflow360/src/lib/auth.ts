import type { UserRole } from '../data/mock'
import { apiFetch, setStoredToken, clearStoredToken } from './api'

export type ApiUserRole = 'REP' | 'MANAGER' | 'FINANCE' | 'ADMIN' | 'CUSTOMER'

export interface ApiUser {
  id: string
  email: string
  name: string
  role: ApiUserRole
  createdAt: string
}

export interface AuthSession {
  token: string
  user: ApiUser
}

export function mapApiRole(role: ApiUserRole): UserRole {
  const map: Record<ApiUserRole, UserRole> = {
    REP: 'sales_rep',
    MANAGER: 'manager',
    FINANCE: 'finance',
    ADMIN: 'admin',
    CUSTOMER: 'customer',
  }
  return map[role]
}

export function toAppUser(user: ApiUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: mapApiRole(user.role),
  }
}

export async function signupUser(data: {
  name: string
  email: string
  password: string
  role: 'REP' | 'MANAGER' | 'FINANCE' | 'ADMIN'
}): Promise<AuthSession> {
  const session = await apiFetch<AuthSession>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  setStoredToken(session.token)
  return session
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
  const session = await apiFetch<AuthSession>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  setStoredToken(session.token)
  return session
}

export async function fetchCurrentUser(): Promise<ApiUser> {
  return apiFetch<ApiUser>('/auth/me')
}

export function logoutUser(): void {
  clearStoredToken()
}
