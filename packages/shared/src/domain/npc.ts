import { z } from 'zod'

/**
 * NPC会話の内容（要件5.3 / design.md §8.6）。
 * 敵=Issueの「要点/難所/対象ファイル/勝利条件」を表す。Runner側でLLM生成しDBキャッシュされる。
 */
export const npcDialogueSchema = z.object({
  /** Issueの要点（1-2文）。 */
  summary: z.string(),
  /** 実装上の難所。 */
  difficultyNote: z.string(),
  /** 変更が必要そうな対象ファイル。 */
  files: z.array(z.string()),
  /** 勝利条件（解決の判定基準）。 */
  winCondition: z.string(),
})
export type NpcDialogue = z.infer<typeof npcDialogueSchema>
