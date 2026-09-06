import { EventEmitter } from 'node:events'
import type { Event } from '@prisma/client'

export type DomainEvent = Event

type EventHandler = (event: DomainEvent) => void | Promise<void>

class TypedEventBus {
  private emitter = new EventEmitter()

  emit(event: DomainEvent): void {
    this.emitter.emit(event.type, event)
    this.emitter.emit('*', event)
  }

  subscribe(eventType: string, handler: EventHandler): void {
    this.emitter.on(eventType, handler)
  }

  subscribeAll(handler: EventHandler): void {
    this.emitter.on('*', handler)
  }
}

export const eventBus = new TypedEventBus()
