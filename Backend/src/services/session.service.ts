import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { nanoid } from 'nanoid'

// The server, not the browser, decides who a socket is.
// A session token is "<sessionId>.<signature>", signed with a secret only the server knows.
// Other people in a room see your sessionId, but without the signature they cannot
// reconnect as you and receive your messages.
//
// Set SESSION_SECRET so tokens survive a restart. Without it a random secret is used,
// and everyone simply gets a new session after a restart (rooms are in memory anyway).
const SECRET = process.env.SESSION_SECRET || randomBytes(32).toString('hex')

const sign = (sessionId: string) =>
  createHmac('sha256', SECRET).update(sessionId).digest('base64url')

export function newSession(): { sessionId: string; sessionToken: string } {
  const sessionId = nanoid()
  return { sessionId, sessionToken: `${sessionId}.${sign(sessionId)}` }
}

// Returns the sessionId inside a token, or null if the token was not signed by this server
export function verifySessionToken(token: unknown): string | null {
  if (typeof token !== 'string') return null
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null

  const sessionId = token.slice(0, dot)
  const given = Buffer.from(token.slice(dot + 1))
  const expected = Buffer.from(sign(sessionId))
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null
  }
  return sessionId
}
