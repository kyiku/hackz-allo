import { describe, expect, it, vi } from 'vitest'
import { handleClientMessage } from './client-dispatch'
import type { RunnerClient } from './runner-client'

function runnerClient(dispatch = vi.fn(async () => {})): RunnerClient {
  return { dispatch }
}

describe('handleClientMessage', () => {
  it('正当なイベントを Runner に転送し ack を返す', async () => {
    const client = runnerClient()
    const reply = await handleClientMessage(
      JSON.stringify({ type: 'cmd.forge', issueNumber: 42 }),
      client,
    )
    expect(client.dispatch).toHaveBeenCalledWith({ type: 'cmd.forge', issueNumber: 42 })
    expect(reply).toEqual({ type: 'ack', received: 'cmd.forge' })
  })

  it('不正なJSON/イベントは転送せず error を返す', async () => {
    const client = runnerClient()
    const reply = await handleClientMessage('not json', client)
    expect(client.dispatch).not.toHaveBeenCalled()
    expect(reply).toEqual({ type: 'error', message: 'invalid client event' })
  })

  it('Runner転送が失敗したら error を返す（接続済みクライアントは落とさない）', async () => {
    const client = runnerClient(
      vi.fn(async () => {
        throw new Error('runner down')
      }),
    )
    const reply = await handleClientMessage(
      JSON.stringify({ type: 'cmd.stop', battleId: 'b1' }),
      client,
    )
    expect(reply).toEqual({ type: 'error', message: 'runner unavailable' })
  })
})
