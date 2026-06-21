import type { Assignment, Loadout, Player, ServerEvent } from '@github-issue-rpg/shared'

/**
 * 編成/チューニングの状態投影（要件5.10）。
 * player.status / world.assignments の配信イベントを提供する。
 */

/** プレイヤー状態/編成の配信イベントを生成する。 */
export function buildPlayerStatusEvent(player: Player, loadout: Loadout): ServerEvent {
  return { type: 'player.status', player, loadout }
}

/** issueアサイン状況の配信イベントを生成する。 */
export function buildAssignmentsEvent(assignments: Assignment[]): ServerEvent {
  return { type: 'world.assignments', assignments }
}
