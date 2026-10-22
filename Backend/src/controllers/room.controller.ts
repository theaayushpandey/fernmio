import { IO } from '../config/socket'
import { Rooms } from '../services/rooms.service'

const err = (msg: string): Error => ({
  name: 'Error',
  message: msg,
})
const GENERIC_ERROR = err('Something went wrong, try again later!')

// Every socket event the client can send: create, join and leave a room, relay a message
export function registerRoomHandlers(io: IO) {
  io.on('connection', socket => {
    console.log('socket connected', socket.id)

    // Tell the browser which session the server gave it, so it can reconnect as itself
    socket.emit('action:session_assigned', {
      sessionId: socket.data.sessionId,
      sessionToken: socket.data.sessionToken,
    })

    const transport = socket.conn.transport.name // in most cases, "polling"
    console.log({ transport })

    socket.conn.on('upgrade', () => {
      const upgradedTransport = socket.conn.transport.name // in most cases, "websocket"
      console.log({ upgradedTransport })
    })

    socket.on('request:create_room', ({ room }, cb) => {
      try {
        room.name =
          room.name ||
          (room.created_by ? `Room by ${room.created_by}` : `with id ${room.id}`)
        const userId = socket.data.sessionId
        const id = Rooms.create(room, userId)
        const created = Rooms.get(id)
        if (!created) {
          cb?.(GENERIC_ERROR)
          return
        }

        socket.join(id)
        io.to(userId).emit('action:room_connection_established', {
          room: created,
        })

        cb?.()
      } catch (err) {
        console.error('Error in request:create_room', err)
        cb?.(GENERIC_ERROR)
      }
    })

    socket.on('request:join_room', async ({ userName, roomId: idOrLink, avatarUrl }, cb) => {
      try {
        // TODO Get permission from the room
        const room = Rooms.get(getRoomId(idOrLink))
        if (!room) {
          cb?.(err('Room not found or expired'))
          return
        }

        const capacity = room.opts?.capacity || 0
        if (Rooms.size(room.id) >= capacity) {
          cb?.(err('Room is full, make a new one!'))
          return
        }

        // Find out the missing ones
        const sockets = await io.in(room.id).fetchSockets()
        const users = Rooms.getUsers(room.id)
        const missing = users.filter(
          userId => !sockets.find(socket => socket.data.sessionId === userId),
        )

        // Declare em Excommunicado
        missing.forEach(userId => {
          kickOut(io, userId, room.id)
        })

        const userId = socket.data.sessionId
        io.to(room.id)
          .except(socket.id)
          .emit('action:establish_peer_connection', {
            userName,
            userId,
            avatarUrl,
          })
        socket.join(room.id)
        io.to(socket.id).emit('action:room_connection_established', { room })
        Rooms.addUser(room.id, userId)

        cb?.()
      } catch (err) {
        console.error('Error in request:join_room', err)
        cb?.(GENERIC_ERROR)
      }
    })

    socket.on('request:leave_room', async ({ roomId }, cb) => {
      try {
        socket.leave(roomId)
        kickOut(io, socket.data.sessionId, roomId)

        if (Rooms.size(roomId) === 0) {
          Rooms.delete(roomId)
        }

        cb?.()
      } catch (err) {
        console.error('Error in request:leave_room', err)
        cb?.(GENERIC_ERROR)
      }
    })

    socket.on('request:send_mesage', async ({ to, roomId, data }, cb) => {
      const userId = socket.data.sessionId

      // Only relay between two people who are both in this room
      const members = Rooms.getUsers(roomId)
      if (!members.includes(userId) || !members.includes(to)) {
        cb?.(err('You can only message people in your room'))
        return
      }

      const sockets = await io.fetchSockets()
      if (!sockets.find(socket => socket.data.sessionId === to)) {
        kickOut(io, to, roomId)
        cb?.(GENERIC_ERROR)
        return
      }
      io.to(to).emit('action:message_received', {
        from: userId,
        data,
      })
      cb?.()
    })

    socket.on('disconnecting', () => { })
  })
}

function kickOut(io: IO, userId: string, roomId: string) {
  io.to(roomId)
    .emit('action:terminate_peer_connection', {
      userId,
    })
  io.to(userId).emit('action:room_connection_terminated', {
    roomId,
  })
  Rooms.removeUser(roomId, userId)
}

const PATH_REGEX = /^\/room\/(?<id>[A-Za-z0-9_-]+$)/
const ID_REGEX = /^(?<id>[A-Za-z0-9_-]+$)/

function getRoomId(idOrLink: string): string | undefined {
  let id: string | undefined
  try {
    const url = new URL(idOrLink) // throws if url is invalid
    /* This does not care about url host so any host is valid as long as that follows below pathname pattern
           /room/<room_id>
           room_id regex = ([A-Za-z0-9_-])+ (same as nanoid character set)
        */
    id = url.pathname.match(PATH_REGEX)?.groups?.id
  } catch (error) {
    // try link as id
    id = idOrLink.match(ID_REGEX)?.groups?.id
  }

  return id
}
