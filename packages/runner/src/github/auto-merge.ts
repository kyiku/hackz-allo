import type { CIStatus } from './ci-status.js'

/** auto-merge の結果。`auto`=GraphQL有効化、`squash-fallback`=CI確認後の通常マージ。 */
export interface AutoMergeResult {
  merged: boolean
  method: 'auto' | 'squash-fallback'
}

export interface AutoMergeDeps {
  /** GraphQL enablePullRequestAutoMerge 試行。失敗時は例外を投げる。 */
  tryEnableAutoMerge: () => Promise<void>
  /** 必須CIの現在状態を取得（フォールバック時の成功ゲート）。 */
  getCIStatus: () => Promise<CIStatus>
  /** 通常 SQUASH マージ。 */
  squashMerge: () => Promise<void>
}

/**
 * auto-merge を有効化する。既知の回帰(422等)を握りつぶさず、
 * 失敗時は必須CI成功を確認してから通常SQUASHマージにフォールバックする（要件5.7）。
 * checks無し/失敗の場合はマージしない。
 */
export async function enableAutoMergeWithFallback(deps: AutoMergeDeps): Promise<AutoMergeResult> {
  try {
    await deps.tryEnableAutoMerge()
    return { merged: false, method: 'auto' }
  } catch {
    // フォールバック: CI成功を確認してから通常マージ
    const ci = await deps.getCIStatus()
    if (ci.state !== 'success') {
      throw new Error(
        `auto-merge有効化に失敗し、フォールバックも不可です（CI状態: ${ci.state}）。checks成功を確認できないためマージしません。`,
      )
    }
    await deps.squashMerge()
    return { merged: true, method: 'squash-fallback' }
  }
}
