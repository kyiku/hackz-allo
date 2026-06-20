import { describe, expect, it, vi } from 'vitest'
import { createHttpRunnerClient } from './runner-client'

describe('createHttpRunnerClient', () => {
  it('クライアントイベントを Runner の /jobs に POST する', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }))
    const client = createHttpRunnerClient('http://127.0.0.1:3002', fetchImpl)
    await client.dispatch({ type: 'cmd.forge', issueNumber: 42 })

    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('http://127.0.0.1:3002/jobs')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(init?.body as string)).toEqual({ type: 'cmd.forge', issueNumber: 42 })
  })

  it('末尾スラッシュ付き baseUrl でも二重スラッシュにならない', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }))
    const client = createHttpRunnerClient('http://127.0.0.1:3002/', fetchImpl)
    await client.dispatch({ type: 'cmd.stop', battleId: 'b1' })
    expect(fetchImpl.mock.calls[0][0]).toBe('http://127.0.0.1:3002/jobs')
  })

  it('Runner が非 2xx を返したら例外を投げる', async () => {
    const fetchImpl = vi.fn(async () => new Response('bad', { status: 400 }))
    const client = createHttpRunnerClient('http://127.0.0.1:3002', fetchImpl)
    await expect(client.dispatch({ type: 'cmd.stop', battleId: 'b1' })).rejects.toThrow()
  })
})
