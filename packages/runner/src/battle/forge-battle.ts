/**
 * 鍛冶屋依頼から戦闘開始までの結線（死守コア、要件5.4）。
 * 依頼 → 必要テスト生成 → ブランチ作成 → ForgeAgent 起動 をオーケストレーションする。
 * 各依存は注入可能（テスト容易性）。
 */

export interface ForgeBattleIssue {
  number: number
  title: string
  body: string
  labels: string[]
}

/** ForgeAgent へのTDD指示プロンプトを組み立てる。 */
export function buildForgePrompt(issue: ForgeBattleIssue, tests: readonly string[]): string {
  const testList = tests.map((t, i) => `${i + 1}. ${t}`).join('\n')
  return [
    `GitHub Issue #${issue.number}「${issue.title}」をTDDで解決してください。`,
    '',
    `## Issue本文\n${issue.body}`,
    '',
    '## 通すべきテスト',
    testList,
    '',
    'まずテストを書いて失敗(RED)を確認し、最小実装でパス(GREEN)させ、リファクタしてください。',
  ].join('\n')
}

export interface StartForgeBattleDeps {
  generateTests(issue: ForgeBattleIssue): Promise<string[]>
  createWorkBranch(issueNumber: number, timestamp: number): Promise<string>
  runForge(params: { prompt: string; worktreePath: string }): AsyncIterable<unknown>
}

export interface StartForgeBattleParams {
  issue: ForgeBattleIssue
  worktreePath: string
  timestamp: number
}

export interface ForgeBattleHandle {
  branch: string
  tests: string[]
  prompt: string
  stream: AsyncIterable<unknown>
}

/**
 * 鍛冶屋依頼を受けて戦闘を開始する。
 * 必要テスト生成 → 作業ブランチ作成 → ForgeAgent 起動の順に実行し、ハンドルを返す。
 */
export async function startForgeBattle(
  deps: StartForgeBattleDeps,
  { issue, worktreePath, timestamp }: StartForgeBattleParams,
): Promise<ForgeBattleHandle> {
  const tests = await deps.generateTests(issue)
  const branch = await deps.createWorkBranch(issue.number, timestamp)
  const prompt = buildForgePrompt(issue, tests)
  const stream = deps.runForge({ prompt, worktreePath })
  return { branch, tests, prompt, stream }
}
