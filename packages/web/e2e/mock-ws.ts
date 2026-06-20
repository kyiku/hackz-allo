import type { ServerEvent } from '@github-issue-rpg/shared'
import type { Page } from '@playwright/test'

/** モックWSのコントローラ。テストから任意のサーバーイベントを送れる。 */
export interface MockGameSocket {
  /** 検証済みサーバーイベントをページ（WSクライアント）へ送る。 */
  send: (event: ServerEvent) => Promise<void>
}

/**
 * `/ws` への WebSocket 接続を横取りし、Backend を差し替えるモック。
 * `page.goto` の前に呼ぶこと（接続確立時にハンドラが発火する）。
 * クライアント→サーバーのメッセージは握り潰す（このアプリは受信専用に投影するだけ）。
 */
export async function mockGameSocket(page: Page): Promise<MockGameSocket> {
  let resolveReady: () => void
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve
  })
  let socket: { send: (data: string) => void } | null = null

  await page.routeWebSocket(/\/ws$/, (ws) => {
    socket = ws
    // クライアント送信(cmd.*)は本E2Eでは不要なので破棄する。
    ws.onMessage(() => {})
    resolveReady()
  })

  return {
    async send(event: ServerEvent) {
      await ready
      socket?.send(JSON.stringify(event))
    },
  }
}
