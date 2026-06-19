/**
 * Runner エントリポイント。
 *
 * AIエージェント(Claude Agent SDK)の実行、GitHub連携、issueポーリング等を担う。
 * オーケストレーションの実体はタスク4.x / 9.2 で実装する。
 *
 * 起動時に秘密情報を含む設定を検証し、欠落していれば即座に失敗する（fail-fast）。
 * 秘密情報そのものはログ出力しない（要件 6.1）。
 * .env からプロセス環境への注入は起動スクリプト(タスク11.1)または `node --env-file` で行う。
 */
import { loadConfig } from './config/index.js'

function main(): void {
  loadConfig()
  // eslint-disable-next-line no-console
  console.log('[runner] config loaded; secrets held in-process only')
}

main()
