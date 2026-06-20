import { describe, expect, it, vi } from 'vitest'
import { handleJobRequest } from './job-server'
import { createJobDispatcher, type JobHandlers } from './dispatcher'

function handlers(): JobHandlers {
  return {
    onForge: vi.fn(async () => {}),
    onSpell: vi.fn(async () => {}),
    onStop: vi.fn(async () => {}),
    onTavern: vi.fn(async () => {}),
    onTavernPublish: vi.fn(async () => {}),
    onLoadoutEquip: vi.fn(async () => {}),
    onLoadoutTune: vi.fn(async () => {}),
    onNpcTalk: vi.fn(async () => {}),
    onConnect: vi.fn(async () => {}),
  }
}

describe('handleJobRequest', () => {
  it('正当なクライアントイベントを dispatch し 202 を返す', async () => {
    const h = handlers()
    const dispatcher = createJobDispatcher(h)
    const res = await handleJobRequest(dispatcher, { type: 'cmd.forge', issueNumber: 42 })
    expect(res.status).toBe(202)
    expect(h.onForge).toHaveBeenCalledWith(42)
  })

  it('不正なイベントは dispatch せず 400 を返す', async () => {
    const h = handlers()
    const dispatcher = createJobDispatcher(h)
    const res = await handleJobRequest(dispatcher, { type: 'bogus.event' })
    expect(res.status).toBe(400)
    expect(h.onForge).not.toHaveBeenCalled()
  })

  it('ハンドラが例外を投げたら 500 を返す（イベント自体は正当）', async () => {
    const h = handlers()
    h.onForge = vi.fn(async () => {
      throw new Error('boom')
    })
    const dispatcher = createJobDispatcher(h)
    const res = await handleJobRequest(dispatcher, { type: 'cmd.forge', issueNumber: 1 })
    expect(res.status).toBe(500)
  })
})
