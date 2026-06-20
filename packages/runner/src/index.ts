/**
 * Runner エントリポイント。
 *
 * AIエージェント(Claude Agent SDK)の実行、GitHub連携、issueポーリング等を担う。
 * 秘密情報の唯一の保持者であり、Backend/Web には渡さない（要件6.1）。
 *
 * 起動時に設定を検証（fail-fast）し、ジョブ受信HTTPサーバを起動する。
 * Backend が `POST /jobs` でクライアントコマンドを転送 → dispatcher が各ハンドラへ振り分ける。
 * ハンドラの実体（GitHub/AI/テスト）は順次結線中（未結線ぶんは明示的に error を返す）。
 *
 * .env からプロセス環境への注入は起動スクリプト(タスク11.1)または `node --env-file` で行う。
 */
import { loadConfig } from './config/index.js'
import {
  createJobDispatcher,
  createJobHandlers,
  startJobServer,
} from './orchestration/index.js'

const JOB_PORT = Number(process.env.RUNNER_PORT ?? 3002)

function main(): void {
  loadConfig()
  const dispatcher = createJobDispatcher(createJobHandlers())
  startJobServer({ port: JOB_PORT, dispatcher })
  // eslint-disable-next-line no-console
  console.log(`[runner] config loaded; job server on http://127.0.0.1:${JOB_PORT}/jobs`)
}

main()
