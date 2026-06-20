import { z } from 'zod'
import { assignmentSchema, battleLogKindSchema } from '../domain/battle.js'
import { enemySchema } from '../domain/enemy.js'
import { loadoutSchema, playerSchema } from '../domain/player.js'
import { rewardSchema } from '../domain/reward.js'
import { issueDraftSchema } from '../domain/tavern.js'
import { worldSchema } from '../domain/world.js'

/**
 * サーバー→クライアント(S→C)のWSイベント。
 * design.md §6 イベント表に準拠する。
 */
export const serverEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('world.state'), world: worldSchema, enemies: z.array(enemySchema) }),
  z.object({ type: z.literal('enemy.appeared'), enemy: enemySchema }),
  z.object({ type: z.literal('enemy.removed'), enemyId: z.number().int() }),
  z.object({
    type: z.literal('battle.started'),
    battleId: z.string(),
    enemyId: z.number().int(),
    hpTotal: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('battle.hp_changed'),
    battleId: z.string(),
    hpCurrent: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal('battle.log'),
    battleId: z.string(),
    line: z.string(),
    kind: battleLogKindSchema,
  }),
  z.object({
    type: z.literal('battle.defeated'),
    battleId: z.string(),
    enemyId: z.number().int(),
    reward: rewardSchema,
  }),
  z.object({ type: z.literal('battle.failed'), battleId: z.string(), reason: z.string() }),
  z.object({ type: z.literal('tavern.issueDraft'), draft: issueDraftSchema }),
  z.object({ type: z.literal('player.status'), player: playerSchema, loadout: loadoutSchema }),
  z.object({ type: z.literal('world.assignments'), assignments: z.array(assignmentSchema) }),
])
export type ServerEvent = z.infer<typeof serverEventSchema>
