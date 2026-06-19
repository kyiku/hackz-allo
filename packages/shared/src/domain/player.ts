import { z } from 'zod'
import { rewardKindSchema } from './reward'

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
