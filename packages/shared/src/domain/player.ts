import { z } from 'zod'
import { rewardKindSchema } from './reward.js'

/** 装備品。撃破報酬に由来し、固定カタログ能力(abilityId)に紐づく。 */
export const equipmentSchema = z.object({
  id: z.number().int(),
  kind: rewardKindSchema,
  name: z.string(),
  abilityId: z.string().nullable(),
})
export type Equipment = z.infer<typeof equipmentSchema>

/** プレイヤーの編成。装備中のIDとパーティ規模を保持する。 */
export const loadoutSchema = z.object({
  equippedIds: z.array(z.number().int()),
  partySize: z.number().int().positive(),
})
export type Loadout = z.infer<typeof loadoutSchema>

/** プレイヤー状態。撃破でEXP/レベルが更新される。 */
export const playerSchema = z.object({
  id: z.number().int(),
  level: z.number().int().positive(),
  exp: z.number().int().nonnegative(),
})
export type Player = z.infer<typeof playerSchema>

/** AIチューニングの努力度（次戦の query() の effort に対応）。 */
export const agentEffortSchema = z.enum(['low', 'medium', 'high'])
export type AgentEffort = z.infer<typeof agentEffortSchema>

/** 次戦の query() の permissionMode（許容値を固定し、任意文字列の混入を防ぐ）。 */
export const permissionModeSchema = z.enum(['default', 'acceptEdits', 'bypassPermissions', 'plan'])
export type PermissionMode = z.infer<typeof permissionModeSchema>

/** パーティ規模の上限（サブエージェント定義数の現実的な上限）。 */
export const MAX_PARTY_SIZE = 5

/**
 * AIチューニングのパッチ（要件5.10 / design.md §3.4, §8.9）。
 * 次回戦闘の ForgeAgent 実行設定（effort/model/permissionMode/パーティ規模）に対応する部分更新。
 * permissionMode は enum で、partySize は [1, MAX_PARTY_SIZE] で縛り、UIだけでなく契約でも検証する。
 */
export const loadoutTuningSchema = z
  .object({
    effort: agentEffortSchema.optional(),
    model: z.string().optional(),
    permissionMode: permissionModeSchema.optional(),
    partySize: z.number().int().positive().max(MAX_PARTY_SIZE).optional(),
  })
  .strict()
export type LoadoutTuning = z.infer<typeof loadoutTuningSchema>
