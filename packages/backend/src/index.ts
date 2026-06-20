import { createServer } from 'node:http'
import { parseServerEvent } from '@github-issue-rpg/shared'
import express from 'express'
import { WebSocketServer } from 'ws'
import { handleClientMessage } from './client-dispatch.js'
import { createEventHub } from './event-hub.js'
import { createHttpRunnerClient } from './runner-client.js'

const PORT = Number(process.env.PORT ?? 3001)
const RUNNER_URL = process.env.RUNNER_URL ?? 'http://127.0.0.1:3002'

const app = express()
app.use(express.json())

const hub = createEventHub()
const runner = createHttpRunnerClient(RUNNER_URL)

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
    // 検証 → Runner へ転送 → ack/error 応答。副作用の実体は Runner が担う。
    void handleClientMessage(data.toString(), runner).then((reply) => {
      socket.send(JSON.stringify(reply))
    })
  })

  socket.on('close', () => {
    unsubscribe()
  })
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[backend] listening on http://localhost:${PORT}`)
})
