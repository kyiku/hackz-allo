import type { Assignment, Loadout, Player, ServerEvent } from '@github-issue-rpg/shared'

/**
 * 編成/チューニングの状態投影（要件5.10）。
 * player.status / world.assignments の配信イベントと、
 * 装備中能力を次戦の query() に注入するための buildAgentOptions を提供する。
 */

/** プレイヤー状態/編成の配信イベントを生成する。 */
export function buildPlayerStatusEvent(player: Player, loadout: Loadout): ServerEvent {
  return { type: 'player.status', player, loadout }
}

/** issueアサイン状況の配信イベントを生成する。 */
export function buildAssignmentsEvent(assignments: Assignment[]): ServerEvent {
  return { type: 'world.assignments', assignments }
}

export interface AgentOptions {
  /** 装備中の固定カタログ能力ID（mcp/skill/plugin）。 */
  abilityIds: string[]
  /** サブエージェント（パーティ）規模。 */
  partySize: number
}

/**
 * 編成から次戦の query() に注入する能力を組み立てる。
 * 装備IDを能力カタログで解決し、未登録のIDは無視する。
 * 実際の mcpServers/plugins/agents への変換はタスク7.4で行う。
 */
export function buildAgentOptions(
  loadout: Loadout,
  abilityByEquipmentId: Record<number, string>,
): AgentOptions {
  const abilityIds = loadout.equippedIds
    .map((id) => abilityByEquipmentId[id])
    .filter((ability): ability is string => Boolean(ability))
  return { abilityIds, partySize: loadout.partySize }
}
