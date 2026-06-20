import type { ClientEvent } from '@github-issue-rpg/shared'

/**
 * Backend → Runner のコマンド転送クライアント。
 * Backend はゲームロジック・秘密情報を持たず、検証済みのクライアントイベントを
 * Runner（副作用の実体・秘密情報の保持者）へそのまま転送する（design.md §8.8）。
 */
export interface RunnerClient {
  dispatch(event: ClientEvent): Promise<void>
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

/**
 * Runner の `POST /jobs` にHTTPでイベントを転送する RunnerClient を生成する。
 *
 * @param baseUrl Runner のベースURL（例: http://127.0.0.1:3002）
 * @param fetchImpl テスト容易性のため注入可能（既定はグローバル fetch）
 */
export function createHttpRunnerClient(
  baseUrl: string,
  fetchImpl: FetchLike = fetch,
): RunnerClient {
  const jobsUrl = `${baseUrl.replace(/\/+$/, '')}/jobs`
  return {
    async dispatch(event) {
      const response = await fetchImpl(jobsUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(event),
      })
      if (!response.ok) {
        throw new Error(`Runnerへの転送に失敗しました (status ${response.status})`)
      }
    },
  }
}
