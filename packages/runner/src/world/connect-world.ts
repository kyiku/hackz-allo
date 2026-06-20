import type { Enemy, ServerEvent, World } from '@github-issue-rpg/shared'
import { buildEnemyStats } from './enemy-stats.js'
import { parseRepoUrl, type FetchedIssue } from './github-issues.js'

/**
 * リポジトリ接続時のワールド生成（要件5.2）。
 * open issue を取得し、各 issue を 1 体の敵へ変換して world.state イベントを組み立てる。
 * 必要テストはLLMで生成するが、失敗してもワールド生成自体は止めない（フォールバックで最低1件）。
 * 永続化やHPの厳密確定（RED確認）は戦闘時に行うため、ここでは決定的IDを割り当てる。
 */

/** world.state イベント（discriminated union から抽出）。 */
export type WorldStateEvent = Extract<ServerEvent, { type: 'world.state' }>

export interface ConnectWorldDeps {
  /** open issue を取得する（owner/name 指定）。 */
  fetchIssues(owner: string, name: string): Promise<FetchedIssue[]>
  /** issue から必要テスト一覧を生成する（LLM）。 */
  generateTests(issue: { title: string; body: string; labels: string[] }): Promise<string[]>
  /** createdAt 用のISO時刻（テスト容易性のため注入）。 */
  now(): string
}

/** デモ用の単一ワールドID。1 リポジトリ = 1 ワールド。 */
const WORLD_ID = 1

/** LLM失敗時の最低限の必要テスト（HP=1, easy になる）。 */
function fallbackTests(issue: FetchedIssue): string[] {
  return [`#${issue.number}「${issue.title}」の受け入れ条件を満たす`]
}

async function resolveTests(deps: ConnectWorldDeps, issue: FetchedIssue): Promise<string[]> {
  try {
    const tests = await deps.generateTests(issue)
    return tests.length > 0 ? tests : fallbackTests(issue)
  } catch {
    return fallbackTests(issue)
  }
}

function toEnemy(issue: FetchedIssue, requiredTests: readonly string[]): Enemy {
  const stats = buildEnemyStats({ requiredTests, labels: issue.labels })
  return {
    id: issue.number,
    worldId: WORLD_ID,
    issueNumber: issue.number,
    title: issue.title,
    hpTotal: stats.hpTotal,
    hpCurrent: stats.hpCurrent,
    difficulty: stats.difficulty,
    weakness: stats.weakness,
    status: 'active',
  }
}

/** リポジトリURLから world.state イベントを生成する。 */
export async function generateWorldState(
  deps: ConnectWorldDeps,
  repoUrl: string,
): Promise<WorldStateEvent> {
  const { owner, name } = parseRepoUrl(repoUrl)
  const issues = await deps.fetchIssues(owner, name)
  const enemies: Enemy[] = []
  for (const issue of issues) {
    const requiredTests = await resolveTests(deps, issue)
    enemies.push(toEnemy(issue, requiredTests))
  }
  const world: World = {
    id: WORLD_ID,
    repoOwner: owner,
    repoName: name,
    repoUrl,
    createdAt: deps.now(),
  }
  return { type: 'world.state', world, enemies }
}
