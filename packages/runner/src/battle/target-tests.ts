/**
 * 生成テストの書き込み・RED確認・対象テスト固定（死守コア、要件5.4）。
 *
 * 生成したテストを書き込んで初回実行した結果から、failed なテストのみを
 * 「対象テスト」として固定し、HP=対象テスト件数を確定する（戦闘開始の前段）。
 * ファイル書き込み・テスト実行自体は実行時（ForgeAgent/コマンド実行）が担い、
 * ここでは RED 確認と対象固定の純粋ロジックを提供する。
 */

export interface TestRunResult {
  testId: string
  state: 'failed' | 'passed'
}

export interface RedTargets {
  targetTestIds: string[]
  hpTotal: number
}

/**
 * 初回実行結果から対象テスト（failed=RED）を固定する。
 * 初回 pass のテストは RED 未確認として除外する。RED が皆無なら例外。
 */
export function finalizeRedTargets(results: readonly TestRunResult[]): RedTargets {
  const targetTestIds = results.filter((r) => r.state === 'failed').map((r) => r.testId)
  if (targetTestIds.length === 0) {
    throw new Error('RED状態(failed)のテストがありません。戦闘を開始できません。')
  }
  return { targetTestIds, hpTotal: targetTestIds.length }
}
