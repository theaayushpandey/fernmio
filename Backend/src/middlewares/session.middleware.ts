import { IO } from '../config/socket'
import { Rooms } from '../services/rooms.service'
import { newSession, verifySessionToken } from '../services/session.service'

// Runs once per connecting socket, before any event handler
export function registerSessionMiddleware(io: IO) {
  io.use((socket, next) => {
    try {
      const { sessionToken, currentRoomId } = socket.handshake.auth

      // Keep the session only if the server signed its token; otherwise start a new one.
      // The browser can no longer pick its own id, so it cannot claim someone else's.
      let sessionId = verifySessionToken(sessionToken)
      if (sessionId) {
        socket.data.sessionToken = sessionToken
      } else {
        const session = newSession()
        sessionId = session.sessionId
        socket.data.sessionToken = session.sessionToken
      }
      // TODO rate limiting
      socket.data.sessionId = sessionId
      /**
      Socket joins the room with same sessionId
      This allows for extra layer above the socket.id, so we just communicate with the sessionId
      */
      socket.join(sessionId)

      // joins room person was already present in
      if (currentRoomId) {
        if (Rooms.getUsers(currentRoomId).includes(sessionId)) {
          socket.join(currentRoomId)
        } else {
          socket.emit('action:room_connection_terminated', {
            roomId: currentRoomId,
          })
        }
      }

      next()
    } catch (error) {
      console.error('Error in use.auth', error)
    }
  })
}
