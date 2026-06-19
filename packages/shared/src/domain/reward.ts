import { z } from 'zod'

/** 報酬の種別。実能力は固定カタログ(abilityId)を参照する。 */
export const rewardKindSchema = z.enum(['weapon', 'armor', 'skill'])
export type RewardKind = z.infer<typeof rewardKindSchema>

/**
 * 撃破報酬。表示名・性能テキストはdiffからLLM生成するが、
 * 実際に挙動を変える能力は固定カタログ(abilityId)に紐づく。
 */
export const rewardSchema = z.object({
  kind: rewardKindSchema,
  name: z.string(),
  description: z.string(),
  abilityId: z.string().nullable(),
})
export type Reward = z.infer<typeof rewardSchema>
