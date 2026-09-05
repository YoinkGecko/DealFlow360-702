import type { FastifyReply } from 'fastify'

export class AppError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export function handleRouteError(reply: FastifyReply, err: unknown): any {
  const e = err as Error & { statusCode?: number }
  return (reply as FastifyReply & { code: (c: number) => FastifyReply }).code(
    e.statusCode ?? 500,
  ).send({ error: e.message })
}
