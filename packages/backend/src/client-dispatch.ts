import { parseClientEvent } from '@github-issue-rpg/shared'
import type { RunnerClient } from './runner-client.js'

/** クライアントへ返す応答（ack か error）。 */
export type ClientReply =
  | { type: 'ack'; received: string }
  | { type: 'error'; message: string }

/**
 * WSで受信したクライアントメッセージ1件を処理する。
 * 検証 → Runner へ転送 → ack を返す。検証失敗/Runner不通は error を返し、接続は維持する。
 */
export async function handleClientMessage(
  raw: string,
  runner: RunnerClient,
): Promise<ClientReply> {
  let event
  try {
    event = parseClientEvent(JSON.parse(raw))
  } catch {
    return { type: 'error', message: 'invalid client event' }
  }
  try {
    await runner.dispatch(event)
    return { type: 'ack', received: event.type }
  } catch {
    return { type: 'error', message: 'runner unavailable' }
  }
}
