import type { ServerEvent } from '@github-issue-rpg/shared'

/**
 * Runner → Backend のイベント送出クライアント。
 * Runner は副作用の結果をサーバーイベントとして Backend に送り、
 * Backend が永続化して全クライアントへ投影する（design.md §6 不変条件）。
 */
export interface BackendClient {
  emit(event: ServerEvent): Promise<void>
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

/** Backend の `POST /api/events` にイベントを送出する BackendClient を生成する。 */
export function createHttpBackendClient(
  baseUrl: string,
  fetchImpl: FetchLike = fetch,
): BackendClient {
  const eventsUrl = `${baseUrl.replace(/\/+$/, '')}/api/events`
  return {
    async emit(event) {
      const response = await fetchImpl(eventsUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
      })
      if (!response.ok) {
        throw new Error(`Backendへのイベント送出に失敗しました (status ${response.status})`)
      }
    },
  }
}
