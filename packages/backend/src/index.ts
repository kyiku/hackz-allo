import { createServer } from 'node:http'
import { parseClientEvent, parseServerEvent } from '@github-issue-rpg/shared'
import express from 'express'
import { WebSocketServer } from 'ws'
import { createEventHub } from './event-hub.js'

const PORT = Number(process.env.PORT ?? 3001)

const app = express()
app.use(express.json())

const hub = createEventHub()

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Runner → Backend: サーバーイベントを取り込み全クライアントへ投影する。
app.post('/api/events', (req, res) => {
  try {
    const event = parseServerEvent(req.body)
    hub.broadcast(event)
    res.status(202).json({ accepted: true })
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'invalid event' })
  }
})

const server = createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket) => {
  const unsubscribe = hub.subscribe((event) => {
    socket.send(JSON.stringify(event))
  })

  // 接続時に現在のワールド状態を送る（要件6.2.3）。
  const snapshot = hub.getLastWorldState()
  if (snapshot) {
    socket.send(JSON.stringify(snapshot))
  }

  socket.on('message', (data) => {
    try {
      const event = parseClientEvent(JSON.parse(data.toString()))
      // ディスパッチ(cmd.forge/spell等)はオーケストレーション(#36)で処理する。
      socket.send(JSON.stringify({ type: 'ack', received: event.type }))
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'invalid client event' }))
    }
  })

  socket.on('close', () => {
    unsubscribe()
  })
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${PORT}`)
})
