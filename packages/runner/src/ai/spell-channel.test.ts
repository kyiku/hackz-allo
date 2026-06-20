import { describe, expect, it, vi } from 'vitest'
import { createSpellChannel, emergencyStop, extractSessionId } from './spell-channel'

describe('createSpellChannel', () => {
  it('cast した呪文を stream で順に受け取り、close で終了する', async () => {
    const channel = createSpellChannel()
    const collected: string[] = []
    const consume = (async () => {
      for await (const msg of channel.stream) {
        collected.push(msg.message.content)
      }
    })()

    channel.cast('null をチェックして')
    channel.cast('境界値も見て')
    channel.close()
    await consume

    expect(collected).toEqual(['null をチェックして', '境界値も見て'])
  })

  it('cast したメッセージは user ロールの SDKメッセージ形式', () => {
    const channel = createSpellChannel()
    channel.close()
    const msg = channel.toMessage('テスト')
    expect(msg.type).toBe('user')
    expect(msg.message.role).toBe('user')
    expect(msg.message.content).toBe('テスト')
  })
})

describe('emergencyStop', () => {
  it('query.interrupt を呼ぶ', async () => {
    const interrupt = vi.fn(async () => {})
    await emergencyStop({ interrupt })
    expect(interrupt).toHaveBeenCalledOnce()
  })
})

describe('extractSessionId', () => {
  it('init systemメッセージから session_id を取り出す', () => {
    expect(extractSessionId({ type: 'system', subtype: 'init', session_id: 'sess_123' })).toBe('sess_123')
  })

  it('該当しないメッセージは null', () => {
    expect(extractSessionId({ type: 'assistant' })).toBeNull()
    expect(extractSessionId({ type: 'system', subtype: 'other', session_id: 'x' })).toBeNull()
  })
})
