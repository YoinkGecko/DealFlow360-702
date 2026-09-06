import type { FastifyRequest } from 'fastify'
import type { UserRole } from '@prisma/client'

export interface JwtUser {
  sub: string
  email: string
  role: UserRole
  name: string
}

export function getAuthUser(request: FastifyRequest): JwtUser {
  const user = request.user as JwtUser | undefined
  if (!user) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 })
  }
  return user
}

export function requireRoles(...roles: UserRole[]) {
  return async (request: FastifyRequest) => {
    const user = getAuthUser(request)
    if (!roles.includes(user.role)) {
      throw Object.assign(new Error('Forbidden'), { statusCode: 403 })
    }
  }
}
