import 'dotenv/config'
import { Server, ServerOptions } from 'socket.io'
import { DefaultEventsMap } from 'socket.io/dist/typed-events'
import {
  IClientToServerEvent,
  IServerToClientEvent,
  ISocketData,
} from '../types'

// The socket.io server, typed with our own events
export type IO = Server<
  IClientToServerEvent,
  IServerToClientEvent,
  DefaultEventsMap,
  ISocketData
>

// ALLOW_ORIGIN is one origin or a JSON array of origins; empty allows any origin
const getCorsOrigin = (): string | string[] => {
  const origin = process.env.ALLOW_ORIGIN
  if (!origin) return '*'
  try {
    return JSON.parse(origin)
  } catch {
    return origin
  }
}

const origin = getCorsOrigin()

export const serverOpts: Partial<ServerOptions> = {
  cors: {
    origin,
    credentials: origin !== '*',
  },
}
