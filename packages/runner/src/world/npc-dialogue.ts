import { z } from 'zod/v4'
import type { StructuredGenerator } from '../ai/structured-generator.js'
import type { NpcDialogue, NpcDialogueRepository } from '../db/repositories/npc-dialogue-repository.js'
import type { IssueSummary } from './enemy-stats.js'

/**
 * NPC会話の事前生成とDBキャッシュ（要件5.3, 6.2）。
 * 敵=Issueの要点/難所/対象ファイル/勝利条件をLLMで生成し、DBにキャッシュする。
 */

const npcDialogueSchema = z.object({
  summary: z.string().describe('Issueの要点（1-2文）'),
  difficultyNote: z.string().describe('実装上の難所'),
  files: z.array(z.string()).describe('変更が必要そうな対象ファイル'),
  winCondition: z.string().describe('勝利条件（解決の判定基準）'),
})

export interface NpcDialogueContent {
  summary: string
  difficultyNote: string
  files: string[]
  winCondition: string
}

/** Issueから NPC会話内容をLLMで生成する。 */
export async function generateNpcDialogue(
  generator: StructuredGenerator,
  issue: IssueSummary,
): Promise<NpcDialogueContent> {
  return generator.generate(npcDialogueSchema, {
    system:
      'あなたは熟練の冒険者ギルドのNPCです。GitHub Issueを攻略対象として、要点・難所・対象ファイル・勝利条件を簡潔に解説してください。',
    prompt: `タイトル: ${issue.title}\nラベル: ${issue.labels.join(', ')}\n本文:\n${issue.body}`,
  })
}

export interface GetOrCreateNpcDialogueParams {
  repo: NpcDialogueRepository
  generator: StructuredGenerator
  enemyId: number
  issue: IssueSummary
  now: string
}

/** キャッシュがあれば返し、無ければ生成して保存する。 */
export async function getOrCreateNpcDialogue({
  repo,
  generator,
  enemyId,
  issue,
  now,
}: GetOrCreateNpcDialogueParams): Promise<NpcDialogue> {
  const cached = repo.findByEnemyId(enemyId)
  if (cached) {
    return cached
  }
  const content = await generateNpcDialogue(generator, issue)
  return repo.create({ enemyId, ...content, createdAt: now })
}
