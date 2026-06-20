import { z } from 'zod'
import { loadoutTuningSchema } from '../domain/player.js'
import { issueDraftSchema } from '../domain/tavern.js'

/**
 * クライアント→サーバー(C→S)のWSイベント。
 * design.md §6 イベント表に準拠する。
 */
export const clientEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('spell.cast'), battleId: z.string(), message: z.string() }),
  z.object({ type: z.literal('cmd.forge'), issueNumber: z.number().int() }),
  z.object({ type: z.literal('cmd.stop'), battleId: z.string() }),
  z.object({ type: z.literal('cmd.tavern'), message: z.string() }),
  z.object({ type: z.literal('cmd.tavern.publish'), draft: issueDraftSchema }),
  z.object({
    type: z.literal('cmd.loadout.equip'),
    equipmentId: z.number().int(),
    equipped: z.boolean(),
  }),
  z.object({ type: z.literal('cmd.loadout.tune'), tuning: loadoutTuningSchema }),
  z.object({ type: z.literal('cmd.npc.talk'), enemyId: z.number().int() }),
  z.object({ type: z.literal('cmd.connect'), repoUrl: z.string().url() }),
  // 報酬ミニゲーム（神経衰弱）で獲得した能力を装備として受け取る。
  z.object({ type: z.literal('cmd.reward.claim'), abilityIds: z.array(z.string()) }),
])
export type ClientEvent = z.infer<typeof clientEventSchema>
