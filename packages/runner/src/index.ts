/**
 * Runner エントリポイント。
 *
 * AIエージェント(Claude Agent SDK)の実行、GitHub連携、issueポーリング等を担う。
 * 秘密情報の唯一の保持者であり、Backend/Web には渡さない（要件6.1）。
 *
 * 起動時に設定を検証（fail-fast）し、ジョブ受信HTTPサーバを起動する。
 * Backend が `POST /jobs` でクライアントコマンドを転送 → dispatcher が各ハンドラへ振り分ける。
 * 結線済み: 編成（装備付け替え / チューニング）、酒場の issue 案生成。
 * GitHub/ForgeAgent/テストの各実体は順次結線中。
 *
 * .env からプロセス環境への注入は起動スクリプト(タスク11.1)または `node --env-file` で行う。
 */
import { getAbility, type Ability } from '@github-issue-rpg/shared'
import { createAgentStructuredGeneratorWithSdk } from './ai/index.js'
import { createNodeForgeBattle } from './battle/index.js'
import { loadConfig, type RunnerConfig } from './config/index.js'
import { createGitHubGateway, createOctokit } from './github/index.js'
import {
  fetchOpenIssues,
  generateRequiredTests,
  generateWorldState,
  parseRepoUrl,
} from './world/index.js'
import type { StructuredGenerator } from './ai/index.js'
import type { BackendClient } from './orchestration/backend-client.js'
import {
  createDatabase,
  createEquipmentRepository,
  createLoadoutRepository,
  createPlayerRepository,
} from './db/index.js'
import {
  createHttpBackendClient,
  createJobDispatcher,
  createJobHandlers,
  startJobServer,
  type JobContext,
} from './orchestration/index.js'

const JOB_PORT = Number(process.env.RUNNER_PORT ?? 3002)
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://127.0.0.1:3001'
const DB_PATH = process.env.RUNNER_DB ?? 'runner.db'

/** 単一プレイヤー前提のデモ用に、プレイヤーと初期編成を用意して JobContext を組み立てる。 */
function buildJobContext(config: RunnerConfig): JobContext {
  const db = createDatabase(DB_PATH)
  const players = createPlayerRepository(db)
  const loadouts = createLoadoutRepository(db)
  const equipment = createEquipmentRepository(db)

  let player = players.findById(1)
  if (!player) {
    player = players.create()
  }
  if (!loadouts.getByPlayer(player.id)) {
    loadouts.createForPlayer(player.id)
  }

  const backend = createHttpBackendClient(BACKEND_URL)
  const generator = createAgentStructuredGeneratorWithSdk()
  const gateway = createGitHubGateway({ octokit: createOctokit(config.githubPat) })
  // 接続中リポジトリの可変状態（onConnect が設定し、forgeBattle/ポーラーが参照する）。
  const session: { repoUrl: string | null; enemyIssueNumbers: Set<number> } = {
    repoUrl: null,
    enemyIssueNumbers: new Set(),
  }
  startWorldPoller({ session, backend, githubPat: config.githubPat, generator })
  const forgeBattle = createNodeForgeBattle({
    githubPat: config.githubPat,
    generator,
    backend,
    getRepoUrl: () => session.repoUrl,
    // 装備中（equippedIds）の equipment を能力カタログへ解決して次戦に反映する。
    getEquippedLoadout: () => {
      const loadout = loadouts.getByPlayer(player.id)
      const equipped = equipment.listByPlayer(player.id)
      const equippedSet = new Set(loadout?.equippedIds ?? [])
      const abilities = equipped
        .filter((item) => equippedSet.has(item.id) && item.abilityId !== null)
        .map((item) => getAbility(item.abilityId as string))
        .filter((ability): ability is Ability => ability !== undefined)
      return { abilities, partySize: loadout?.partySize ?? 1 }
    },
  })

  return {
    backend,
    players,
    loadouts,
    equipment,
    // サブスク認証（Claude ログイン）で動く構造化生成器。APIキー不要。
    generator,
    // PAT は Runner 内に閉じ、owner/name を受けて open issue を取得する関数として渡す。
    fetchIssues: (owner, name) => fetchOpenIssues(config.githubPat, { owner, name }),
    createIssue: (owner, name, draft) =>
      gateway.createIssue({ owner, name, url: `https://github.com/${owner}/${name}` }, draft),
    session,
    forgeBattle,
    playerId: player.id,
  }
}

/** ワールド更新間隔(ms)。一定間隔で open issue を取得し、閉じた敵を撤去する（要件5.2）。 */
const WORLD_POLL_INTERVAL = 20000

/** 2つの数値集合が同一か。 */
function sameNumberSet(a: ReadonlySet<number>, b: ReadonlySet<number>): boolean {
  if (a.size !== b.size) return false
  for (const n of a) if (!b.has(n)) return false
  return true
}

/**
 * 接続中リポジトリの open issue を定期取得し、集合が変化したら world.state を丸ごと再配信する。
 * クライアントは world.state で敵を総入れ替えするため、クローズ済みの敵は確実に消え、
 * 新規 issue も反映される（再起動や取りこぼし後も次の周期で自己修復, 要件5.2）。
 * 集合が不変の周期では何もしない（LLM/通信を無駄に呼ばない）。
 */
function startWorldPoller(deps: {
  session: { repoUrl: string | null; enemyIssueNumbers: Set<number> }
  backend: BackendClient
  githubPat: string
  generator: StructuredGenerator
}): void {
  setInterval(() => {
    const repoUrl = deps.session.repoUrl
    if (!repoUrl) return
    void (async () => {
      try {
        const { owner, name } = parseRepoUrl(repoUrl)
        const issues = await fetchOpenIssues(deps.githubPat, { owner, name })
        const current = new Set(issues.map((issue) => issue.number))
        if (sameNumberSet(current, deps.session.enemyIssueNumbers)) return
        // 変化あり → 権威的な world.state を再生成して再配信（全クライアントが同期）。
        const event = await generateWorldState(
          {
            fetchIssues: async () => issues, // 取得済みを再利用（二重フェッチ回避）
            generateTests: (issue) => generateRequiredTests(deps.generator, issue),
            now: () => new Date().toISOString(),
          },
          repoUrl,
        )
        await deps.backend.emit(event)
        deps.session.enemyIssueNumbers = current
      } catch {
        // 一時的な取得失敗は無視（次の周期で再試行）。
      }
    })()
  }, WORLD_POLL_INTERVAL)
}

function main(): void {
  const config = loadConfig()
  const dispatcher = createJobDispatcher(createJobHandlers(buildJobContext(config)))
  startJobServer({ port: JOB_PORT, dispatcher })
  // eslint-disable-next-line no-console
  console.log(`[runner] config loaded; job server on http://127.0.0.1:${JOB_PORT}/jobs`)
}

main()
