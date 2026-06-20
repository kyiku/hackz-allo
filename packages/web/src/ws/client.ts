import {
  parseClientEvent,
  parseServerEvent,
  type ClientEvent,
  type ServerEvent,
} from '@github-issue-rpg/shared'
import type { ConnectionStatus } from '../store/gameStore.js'

/**
 * WebSocket のうち本クライアントが使うメンバだけを抽出した型。
 * 依存注入とテスト容易性のため、ブラウザの `WebSocket` をこの形で受け取る。
 */
export interface WebSocketLike {
  send(data: string): void
  close(): void
  onopen: ((ev: unknown) => void) | null
  onclose: ((ev: unknown) => void) | null
  onmessage: ((ev: { data: unknown }) => void) | null
  onerror: ((ev: unknown) => void) | null
}

export type WebSocketFactory = (url: string) => WebSocketLike

export interface GameSocketOptions {
  url: string
  /** 検証済みサーバーイベントの受信ハンドラ。 */
  onEvent: (event: ServerEvent) => void
  /** 接続状態の変化通知。 */
  onStatus: (status: ConnectionStatus) => void
  /** WebSocket 実体の生成（既定はブラウザの `WebSocket`）。テストで差し替える。 */
  createWebSocket?: WebSocketFactory
  /** 切断時の再接続待ち時間(ms)。0 以下で再接続しない。 */
  reconnectDelayMs?: number
}

export interface GameSocket {
  /** クライアントイベントを検証して送信する。 */
  send: (event: ClientEvent) => void
  /** 接続を閉じ、自動再接続を停止する。 */
  close: () => void
}

const defaultFactory: WebSocketFactory = (url) => new WebSocket(url) as unknown as WebSocketLike

/**
 * ServerEvent 以外の制御フレーム(ack/error 等)か判定する。
 * Backend は C→S 受信時に `{type:'ack'|'error'}` を返すため、これらは破棄対象として静かに無視する。
 */
function isControlFrame(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const type = (value as { type?: unknown }).type
  return type === 'ack' || type === 'error' || type === 'connection.established'
}

/**
 * Backend(`/ws`)に接続し、サーバーイベントを zod 検証して `onEvent` に流すクライアント。
 * - 受信は `parseServerEvent` で検証。ack/error 等の制御フレームや不正メッセージは破棄する。
 * - 送信は `parseClientEvent` で検証してから送る（不正な送信を防ぐ）。
 * - 切断時は `reconnectDelayMs` 後に再接続する（明示 `close()` 時を除く）。
 */
export function createGameSocket(options: GameSocketOptions): GameSocket {
  const {
    url,
    onEvent,
    onStatus,
    createWebSocket = defaultFactory,
    reconnectDelayMs = 2000,
  } = options
  let socket: WebSocketLike | null = null
  let closedByUser = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect(): void {
    onStatus('connecting')
    const ws = createWebSocket(url)
    socket = ws

    ws.onopen = () => onStatus('open')

    ws.onmessage = (ev) => {
      let data: unknown
      try {
        data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
      } catch {
        return
      }
      if (isControlFrame(data)) return
      try {
        onEvent(parseServerEvent(data))
      } catch (error) {
        // 契約外メッセージは破棄（開発時の気付き用に警告）。
        // eslint-disable-next-line no-console
        console.warn('[ws] 不正なサーバーイベントを破棄しました', error)
      }
    }

    ws.onclose = () => {
      socket = null
      onStatus('closed')
      if (!closedByUser && reconnectDelayMs > 0) {
        reconnectTimer = setTimeout(connect, reconnectDelayMs)
      }
    }

    ws.onerror = () => {
      // 切断は onclose で扱うためここでは何もしない。
    }
  }

  connect()

  return {
    send(event) {
      const validated = parseClientEvent(event)
      socket?.send(JSON.stringify(validated))
    },
    close() {
      closedByUser = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    },
  }
}
