import 'dotenv/config'
import type { FastifyReply, FastifyRequest } from 'fastify'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { initEmailTransport } from './core/email.js'
import { registerEventHandlers } from './core/event-handlers.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { catalogRoutes } from './modules/catalog/catalog.routes.js'
import { policyRoutes } from './modules/policy/policy.routes.js'
import { quotesRoutes } from './modules/quotes/quotes.routes.js'
import { auditRoutes } from './modules/audit/audit.routes.js'
import { fulfillmentRoutes } from './modules/fulfillment/fulfillment.routes.js'
import { billingRoutes } from './modules/billing/billing.routes.js'
import { recsRoutes } from './modules/recs/recs.routes.js'
import { dealHealthRoutes } from './modules/deal-health/deal-health.routes.js'
import { portalRoutes } from './modules/portal/portal.routes.js'
import { customersRoutes } from './modules/customers/customers.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

async function buildServer() {
  const app = Fastify({ logger: true, maxParamLength: 500 }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  })

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'Unauthorized' })
    }
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'DealFlow360 API',
        description:
          'B2B sales operations platform — event-sourced modular monolith. Business rules are config-driven, never hardcoded.',
        version: '1.0.0',
      },
      servers: [{ url: `http://localhost:${PORT}`, description: 'Local dev' }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  })

  app.get('/health', async () => ({ status: 'ok', service: 'dealflow360-api' }))

  await app.register(authRoutes)
  await app.register(catalogRoutes)
  await app.register(policyRoutes)
  await app.register(quotesRoutes)
  await app.register(auditRoutes)
  await app.register(fulfillmentRoutes)
  await app.register(billingRoutes)
  await app.register(recsRoutes)
  await app.register(dealHealthRoutes)
  await app.register(portalRoutes)
  await app.register(customersRoutes)
  await app.register(notificationsRoutes)

  return app
}

async function main() {
  registerEventHandlers()
  await initEmailTransport()
  const app = await buildServer()
  await app.listen({ port: PORT, host: HOST })
  app.log.info(`Swagger UI: http://localhost:${PORT}/docs`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
