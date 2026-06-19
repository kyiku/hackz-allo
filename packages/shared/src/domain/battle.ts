import { z } from 'zod'

/** 戦闘状態機械の状態（出現→RED→戦闘中→詰め→撃破/失敗）。 */
export const battleStatusSchema = z.enum([
  'appeared',
  'red',
  'fighting',
  'closing',
  'defeated',
  'failed',
])
export type BattleStatus = z.infer<typeof battleStatusSchema>

/** RPG風戦闘ログの種別（演出の色分けに使う）。 */
export const battleLogKindSchema = z.enum(['attack', 'heal', 'system', 'spell', 'info'])
export type BattleLogKind = z.infer<typeof battleLogKindSchema>

/** issueのアサイン状況（world.assignments で配信）。 */
export const assignmentSchema = z.object({
  issueNumber: z.number().int(),
  enemyId: z.number().int(),
  battleId: z.string().nullable(),
  status: battleStatusSchema,
})
export type Assignment = z.infer<typeof assignmentSchema>
