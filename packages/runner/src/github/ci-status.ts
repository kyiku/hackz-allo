/** CI（GitHub Actions check-runs）の集約状態。 */
export type CIState = 'pending' | 'success' | 'failure' | 'no_checks'

export interface CIStatus {
  state: CIState
  total: number
}

export interface CheckRunLike {
  status: string
  conclusion: string | null
}

const FAILURE_CONCLUSIONS = new Set(['failure', 'timed_out', 'cancelled', 'action_required', 'stale'])

/**
 * check-runs の配列を集約して CI 状態を判定する。
 * - checks が無い場合は `no_checks`（成功扱いにはしない）
 * - 1つでも未完了なら `pending`
 * - 全完了で失敗系が1つでもあれば `failure`、無ければ `success`
 */
export function aggregateCheckRuns(runs: readonly CheckRunLike[]): CIStatus {
  if (runs.length === 0) {
    return { state: 'no_checks', total: 0 }
  }
  const allCompleted = runs.every((run) => run.status === 'completed')
  if (!allCompleted) {
    return { state: 'pending', total: runs.length }
  }
  const hasFailure = runs.some((run) => FAILURE_CONCLUSIONS.has(run.conclusion ?? ''))
  return { state: hasFailure ? 'failure' : 'success', total: runs.length }
}

export interface WaitForCIOptions {
  intervalMs?: number
  maxAttempts?: number
  /** テスト用に注入可能な sleep。既定は setTimeout ベース。 */
  sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * CI が終端状態(pending以外)になるまでポーリングする。
 * maxAttempts を超えても pending のままなら最後の状態を返す。
 */
export async function waitForCI(
  fetchStatus: () => Promise<CIStatus>,
  options: WaitForCIOptions = {},
): Promise<CIStatus> {
  const { intervalMs = 5000, maxAttempts = 60, sleep = defaultSleep } = options
  let status = await fetchStatus()
  let attempts = 1
  while (status.state === 'pending' && attempts < maxAttempts) {
    await sleep(intervalMs)
    status = await fetchStatus()
    attempts += 1
  }
  return status
}
