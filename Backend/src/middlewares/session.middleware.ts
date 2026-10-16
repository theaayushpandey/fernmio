import { IO } from '../config/socket'
import { Rooms } from '../services/rooms.service'

// Runs once per connecting socket, before any event handler
export function registerSessionMiddleware(io: IO) {
  io.use((socket, next) => {
    try {
      const { sessionId, currentRoomId } = socket.handshake.auth
      if (!sessionId) {
        return next(new Error('No sessionId provided'))
      }
      // TODO anonymous auth and/or rate limiting
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
