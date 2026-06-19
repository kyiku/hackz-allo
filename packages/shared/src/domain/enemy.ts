import { z } from 'zod'

/** 敵の難易度（ルールベースで算出）。 */
export const difficultySchema = z.enum(['easy', 'normal', 'hard', 'boss'])
export type Difficulty = z.infer<typeof difficultySchema>

/** 敵の状態。issueのオープン/クローズや撃破に対応する。 */
export const enemyStatusSchema = z.enum(['active', 'defeated', 'removed'])
export type EnemyStatus = z.infer<typeof enemyStatusSchema>

/** 1 issue = 1 敵。HPは対象テスト件数で確定する。 */
export const enemySchema = z.object({
  id: z.number().int(),
  worldId: z.number().int(),
  issueNumber: z.number().int(),
  title: z.string(),
  hpTotal: z.number().int().nonnegative(),
  hpCurrent: z.number().int().nonnegative(),
  difficulty: difficultySchema,
  weakness: z.string().nullable(),
  status: enemyStatusSchema,
})
export type Enemy = z.infer<typeof enemySchema>
