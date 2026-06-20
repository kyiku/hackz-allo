import { z } from 'zod/v4'
import { getAbility, type Reward } from '@github-issue-rpg/shared'
import type { StructuredGenerator } from '../ai/structured-generator.js'

/**
 * 報酬生成（RewardForge、要件5.8）。
 * diff から武器/防具/スキルの表示名・性能テキストをLLM生成する。
 * 実際に挙動を変える能力は固定カタログ(abilityId)を参照する。
 */

const rewardForgeSchema = z.object({
  kind: z.enum(['weapon', 'armor', 'skill']).describe('報酬の種別'),
  name: z.string().describe('RPG風の装備名（日本語、カッコよく）'),
  description: z.string().describe('性能を表すフレーバーテキスト'),
})

export interface GenerateRewardParams {
  diff: string
  /** 実能力を与える場合のカタログID（null=見た目のみ）。 */
  abilityId?: string | null
}

/** diff から報酬を生成する。abilityId はカタログ存在を検証する。 */
export async function generateReward(
  generator: StructuredGenerator,
  { diff, abilityId = null }: GenerateRewardParams,
): Promise<Reward> {
  if (abilityId !== null && getAbility(abilityId) === undefined) {
    throw new Error(`能力カタログに存在しない abilityId です: ${abilityId}`)
  }
  const generated = await generator.generate(rewardForgeSchema, {
    system:
      'あなたは伝説の鍛冶師です。コードのdiffを見て、得られる報酬（武器/防具/スキル）の名前と性能テキストをRPG風に命名してください。',
    prompt: `以下のdiffから報酬を生成してください:\n${diff}`,
  })
  return { ...generated, abilityId }
}
