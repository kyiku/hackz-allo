/**
 * 安全要件の集約（要件6.1）。
 * main直push禁止 / コマンド実行制限 / 作業ログredaction / 緊急停止 を一箇所から参照できるようにする。
 * 通し動作の検証は safety-wiring.test.ts。
 */
export { createGitClient } from '../github/git-client.js'
export { buildCanUseTool, evaluateToolUse, isDestructiveCommand } from '../ai/command-restriction.js'
export { emergencyStop } from '../ai/spell-channel.js'
export { redactSecrets } from '../log/redaction.js'
export { saveWorkLog, createWorkLogRepository } from '../db/repositories/work-log-repository.js'
