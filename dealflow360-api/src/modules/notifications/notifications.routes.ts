import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { errorSchema } from '../../core/schemas.js'
import { getAuthUser } from '../../core/auth-middleware.js'
import { handleRouteError } from '../../core/errors.js'
import * as notificationsService from './notifications.service.js'

export async function notificationsRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>()

  server.get(
    '/notifications',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        response: {
          200: z.object({
            notifications: z.array(
              z.object({
                id: z.string().uuid(),
                quoteId: z.string().uuid().nullable(),
                message: z.string(),
                read: z.boolean(),
                time: z.string().datetime(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const user = getAuthUser(request)
      const notifications = await notificationsService.listNotificationsForUser(user.sub)
      return { notifications }
    },
  )

  server.patch(
    '/notifications/:id/read',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['Notifications'],
        security: [{ bearerAuth: [] }],
        params: z.object({ id: z.string().uuid() }),
        response: { 200: z.object({ ok: z.literal(true) }), 404: errorSchema },
      },
    },
    async (request, reply) => {
      try {
        const user = getAuthUser(request)
        await notificationsService.markNotificationRead(user.sub, request.params.id)
        return { ok: true as const }
      } catch (err) {
        return handleRouteError(reply, err)
      }
    },
  )
}
