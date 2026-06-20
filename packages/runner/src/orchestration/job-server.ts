import { createServer, type IncomingMessage, type Server } from 'node:http'
import { parseClientEvent } from '@github-issue-rpg/shared'
import type { JobDispatcher } from './dispatcher.js'

/** ジョブ受信の処理結果（HTTPステータスと本文）。 */
export interface JobResponse {
  status: number
  body: Record<string, unknown>
}

/**
 * Backend から転送されたクライアントイベント1件を検証してディスパッチする。
 * - 不正なイベント: 400（ディスパッチしない）
 * - ハンドラ例外: 500
 * - 正常: 202
 * 副作用（Git/AI/テスト）の実体はハンドラ側が担う。ここは検証と振り分けに徹する。
 */
export async function handleJobRequest(
  dispatcher: JobDispatcher,
  rawBody: unknown,
): Promise<JobResponse> {
  let event
  try {
    event = parseClientEvent(rawBody)
  } catch (error) {
    return {
      status: 400,
      body: { error: error instanceof Error ? error.message : 'invalid client event' },
    }
  }
  try {
    await dispatcher.dispatch(event)
    return { status: 202, body: { accepted: true } }
  } catch (error) {
    return {
      status: 500,
      body: { error: error instanceof Error ? error.message : 'job failed' },
    }
  }
}

/** リクエストボディ全体を文字列として読み取る。 */
function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

export interface JobServerOptions {
  port: number
  dispatcher: JobDispatcher
}

/**
 * Runner のジョブ受信HTTPサーバを起動する。
 * Backend が `POST /jobs` でクライアントイベントを転送してくる前提（design.md §8.8）。
 * Runner は秘密情報の唯一の保持者であり、localhost のみで待ち受ける。
 */
export function startJobServer({ port, dispatcher }: JobServerOptions): Server {
  const server = createServer((req, res) => {
    if (req.method !== 'POST' || req.url !== '/jobs') {
      res.writeHead(404).end()
      return
    }
    readBody(req)
      .then(async (raw) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          res.writeHead(400, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ error: 'invalid json' }))
          return
        }
        const result = await handleJobRequest(dispatcher, parsed)
        res.writeHead(result.status, { 'content-type': 'application/json' })
        res.end(JSON.stringify(result.body))
      })
      .catch(() => {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'internal error' }))
      })
  })
  server.listen(port, '127.0.0.1')
  return server
}
