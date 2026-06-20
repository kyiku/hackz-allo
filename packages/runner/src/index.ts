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
import { createAgentStructuredGeneratorWithSdk } from './ai/index.js'
import { loadConfig } from './config/index.js'
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
function buildJobContext(): JobContext {
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

  return {
    backend: createHttpBackendClient(BACKEND_URL),
    players,
    loadouts,
    equipment,
    // サブスク認証（Claude ログイン）で動く構造化生成器。APIキー不要。
    generator: createAgentStructuredGeneratorWithSdk(),
    playerId: player.id,
  }
}

function main(): void {
  loadConfig()
  const dispatcher = createJobDispatcher(createJobHandlers(buildJobContext()))
  startJobServer({ port: JOB_PORT, dispatcher })
  // eslint-disable-next-line no-console
  console.log(`[runner] config loaded; job server on http://127.0.0.1:${JOB_PORT}/jobs`)
}

main()
