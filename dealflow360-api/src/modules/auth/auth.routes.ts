import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  authTokenSchema,
  errorSchema,
  loginBodySchema,
  signupBodySchema,
  userSchema,
} from '../../core/schemas.js'
import { handleRouteError } from '../../core/errors.js'
import * as authService from './auth.service.js'

export async function authRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.post(
    '/auth/signup',
    {
      schema: {
        tags: ['Auth'],
        description: 'Register an internal user (REP, MANAGER, FINANCE, ADMIN)',
        body: signupBodySchema,
        response: {
          201: authTokenSchema,
          400: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await authService.signupUser(request.body)
        const token = await reply.jwtSign({
          sub: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        })
        return reply.status(201).send({
          token,
          user: { ...user, createdAt: user.createdAt.toISOString() },
        })
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.post(
    '/auth/login',
    {
      schema: {
        tags: ['Auth'],
        body: loginBodySchema,
        response: {
          200: authTokenSchema,
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const user = await authService.loginUser(request.body.email, request.body.password)
        const token = await reply.jwtSign({
          sub: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        })
        return {
          token,
          user: { ...user, createdAt: user.createdAt.toISOString() },
        }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )

  server.get(
    '/auth/me',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Auth'],
        security: [{ bearerAuth: [] }],
        response: {
          200: userSchema,
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as { sub: string }
      const user = await authService.getUserById(payload.sub)
      if (!user) {
        return reply.status(401).send({ error: 'User not found' })
      }
      return { ...user, createdAt: user.createdAt.toISOString() }
    },
  )
}
