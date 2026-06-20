import { describe, expect, it, vi } from 'vitest'
import { createHttpBackendClient } from './backend-client'

describe('createHttpBackendClient', () => {
  it('サーバーイベントを Backend の /api/events に POST する', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }))
    const client = createHttpBackendClient('http://127.0.0.1:3001', fetchImpl)
    await client.emit({ type: 'enemy.removed', enemyId: 10 })

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:3001/api/events')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ type: 'enemy.removed', enemyId: 10 })
  })

  it('非 2xx は例外を投げる', async () => {
    const fetchImpl = vi.fn(async () => new Response('x', { status: 400 }))
    const client = createHttpBackendClient('http://127.0.0.1:3001', fetchImpl)
    await expect(client.emit({ type: 'enemy.removed', enemyId: 1 })).rejects.toThrow()
  })
})
