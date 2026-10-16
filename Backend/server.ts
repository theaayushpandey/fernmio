import 'dotenv/config'
import { createServer } from 'http'
import { Server } from 'socket.io'
import packageJson from './package.json'
import { IO, serverOpts } from './src/config/socket'
import { registerSessionMiddleware } from './src/middlewares/session.middleware'
import { registerRoomHandlers } from './src/controllers/room.controller'

console.log('version', packageJson.version)
console.log('allow', process.env.ALLOW_ORIGIN)

// Plain HTTP answers "ok" so hosting health checks pass; everything else is socket.io
const httpServer = createServer((_, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('ok\n');
})

const io: IO = new Server(httpServer, serverOpts)

registerSessionMiddleware(io)
registerRoomHandlers(io)

const port = process.env.PORT || 5005
httpServer.listen(port, () => {
  console.log('listening on port', port)
})
