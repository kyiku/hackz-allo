import type { BattleLogKind } from '@github-issue-rpg/shared'

/**
 * パーティ（サブエージェント）成長と委譲検出（要件5.8, 5.10）。
 * party_size に応じて query() の agents に渡す定義を増やす。
 * 委譲の発生は subagent 開始/終了 hook で検出して演出する（並列委譲は死守コア外）。
 */

export interface PartyAgentDefinition {
  name: string
  description: string
}

/** パーティの仲間ロール（party_size-1 体まで採用）。 */
const PARTY_ROLES: readonly PartyAgentDefinition[] = [
  { name: 'reviewer', description: 'コードレビュー担当。バグや設計の問題を指摘する。' },
  { name: 'test-writer', description: 'テスト作成担当。網羅的なテストケースを書く。' },
  { name: 'refactorer', description: 'リファクタ担当。重複や複雑さを整理する。' },
  { name: 'researcher', description: '調査担当。関連コードや仕様を調べる。' },
]

/** party_size から query() に渡すサブエージェント定義を組み立てる（本体1＋仲間 size-1）。 */
export function buildPartyAgents(partySize: number): PartyAgentDefinition[] {
  const companions = Math.max(0, Math.min(partySize - 1, PARTY_ROLES.length))
  return PARTY_ROLES.slice(0, companions).map((role) => ({ ...role }))
}

export interface SubagentHook {
  type: string
  name: string
}

export interface DelegationLog {
  line: string
  kind: BattleLogKind
}

/** subagent 開始/終了 hook を委譲ログへ変換する。無関係な hook は null。 */
export function delegationLogFromHook(hook: SubagentHook): DelegationLog | null {
  if (hook.type === 'subagent_start') {
    return { line: `🤝 仲間「${hook.name}」に委譲した！`, kind: 'info' }
  }
  if (hook.type === 'subagent_stop') {
    return { line: `✅ 仲間「${hook.name}」が任務を完了した`, kind: 'info' }
  }
  return null
}
