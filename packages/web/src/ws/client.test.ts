import type { ServerEvent } from '@github-issue-rpg/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGameSocket, type WebSocketLike } from './client'
import type { ConnectionStatus } from '../store/gameStore'

class FakeWebSocket implements WebSocketLike {
  onopen: ((ev: unknown) => void) | null = null
  onclose: ((ev: unknown) => void) | null = null
  onmessage: ((ev: { data: unknown }) => void) | null = null
  onerror: ((ev: unknown) => void) | null = null
  sent: string[] = []
  closed = false

  send(data: string): void {
    this.sent.push(data)
  }
  close(): void {
    this.closed = true
    this.onclose?.({})
  }

  // テスト用トリガ
  emitOpen(): void {
    this.onopen?.({})
  }
  emitMessage(data: unknown): void {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) })
  }
}

function setup(reconnectDelayMs = 0) {
  const sockets: FakeWebSocket[] = []
  const events: ServerEvent[] = []
  const statuses: ConnectionStatus[] = []
  const socket = createGameSocket({
    url: 'ws://test/ws',
    onEvent: (e) => events.push(e),
    onStatus: (s) => statuses.push(s),
    createWebSocket: () => {
      const ws = new FakeWebSocket()
      sockets.push(ws)
      return ws
    },
    reconnectDelayMs,
  })
  return { socket, sockets, events, statuses }
}

const worldState: ServerEvent = {
  type: 'world.state',
  world: {
    id: 1,
    repoOwner: 'kyiku',
    repoName: 'hackz-allo',
    repoUrl: 'https://github.com/kyiku/hackz-allo',
    createdAt: '2026-06-20T00:00:00.000Z',
  },
  enemies: [],
}

describe('createGameSocket', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('接続時に connecting → open を通知する', () => {
    const { sockets, statuses } = setup()
    expect(statuses).toEqual(['connecting'])
    sockets[0]!.emitOpen()
    expect(statuses).toEqual(['connecting', 'open'])
  })

  it('検証済みサーバーイベントを onEvent に流す', () => {
    const { sockets, events } = setup()
    sockets[0]!.emitMessage(worldState)
    expect(events).toEqual([worldState])
  })

  it('ack/error 等の制御フレームは破棄する', () => {
    const { sockets, events } = setup()
    sockets[0]!.emitMessage({ type: 'ack', received: 'cmd.forge' })
    sockets[0]!.emitMessage({ type: 'error', message: 'invalid client event' })
    expect(events).toEqual([])
  })

  it('契約外メッセージは破棄し onEvent を呼ばない', () => {
    const { sockets, events } = setup()
    sockets[0]!.emitMessage({ type: 'totally.unknown' })
    expect(events).toEqual([])
  })

  it('クライアントイベントを検証して JSON 送信する', () => {
    const { socket, sockets } = setup()
    socket.send({ type: 'cmd.forge', issueNumber: 42 })
    expect(sockets[0]!.sent).toEqual([JSON.stringify({ type: 'cmd.forge', issueNumber: 42 })])
  })

  it('不正なクライアントイベントの送信は例外を投げる', () => {
    const { socket } = setup()
    // @ts-expect-error 不正なペイロード（issueNumber 欠落）を検証で弾く
    expect(() => socket.send({ type: 'cmd.forge' })).toThrow()
  })

  it('明示 close 後は再接続しない', () => {
    vi.useFakeTimers()
    const { socket, sockets } = setup(1000)
    socket.close()
    vi.advanceTimersByTime(5000)
    expect(sockets).toHaveLength(1)
    vi.useRealTimers()
  })

  it('予期しない切断では再接続する', () => {
    vi.useFakeTimers()
    const { sockets } = setup(1000)
    sockets[0]!.onclose?.({})
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(2)
    vi.useRealTimers()
  })
})
