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
import { authRoutes } from './modules/auth/auth.routes.js'
import { catalogRoutes } from './modules/catalog/catalog.routes.js'
import { policyRoutes } from './modules/policy/policy.routes.js'
import { quotesRoutes } from './modules/quotes/quotes.routes.js'
import { auditRoutes } from './modules/audit/audit.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '0.0.0.0'

async function buildServer() {
  const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: true })

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

  return app
}

async function main() {
  const app = await buildServer()
  await app.listen({ port: PORT, host: HOST })
  app.log.info(`Swagger UI: http://localhost:${PORT}/docs`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
