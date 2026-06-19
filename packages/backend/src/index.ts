import { createServer } from 'node:http'
import express from 'express'
import { WebSocketServer } from 'ws'

const PORT = Number(process.env.PORT ?? 3001)

const app = express()
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

const server = createServer(app)

// WebSocketハブ（§6イベント表に準拠した実装はタスク9.1で追加する）
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connection.established' }))
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${PORT}`)
})
