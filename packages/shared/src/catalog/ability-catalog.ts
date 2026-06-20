import { z } from 'zod'

/**
 * 能力カタログ（固定、要件5.8/5.10）。
 * ability_id を実体（skill_id / mcp_id / plugin）に対応づける。報酬の実能力はここを参照する。
 * 表示名・性能テキストはLLM生成でも、実際に挙動を変える能力はこのカタログに限定する。
 */

export const abilityKindSchema = z.enum(['skill', 'mcp', 'plugin'])
export type AbilityKind = z.infer<typeof abilityKindSchema>

export const abilitySchema = z.object({
  id: z.string(),
  kind: abilityKindSchema,
  /** 実体の識別子（Claude Agent SDK の skill_id / mcpServer名 / plugin名）。 */
  ref: z.string(),
  displayName: z.string(),
  description: z.string(),
})
export type Ability = z.infer<typeof abilitySchema>

/** MVPの固定カタログ（3個）。装備で次戦の query() 設定に注入される。 */
export const ABILITY_CATALOG: readonly Ability[] = [
  {
    id: 'ability.tdd-skill',
    kind: 'skill',
    ref: 'tdd',
    displayName: 'TDDの心得',
    description: 'テスト駆動の作法を授ける。RED→GREEN→Refactorを徹底する。',
  },
  {
    id: 'ability.github-mcp',
    kind: 'mcp',
    ref: 'github',
    displayName: 'github連携の籠手',
    description: 'GitHub MCPサーバーを介して連携操作を強化する。',
  },
  {
    id: 'ability.refactor-plugin',
    kind: 'plugin',
    ref: 'refactor-cleaner',
    displayName: '整地の杖',
    description: '不要コードの整理とリファクタを促すプラグイン。',
  },
]

const CATALOG_BY_ID = new Map(ABILITY_CATALOG.map((ability) => [ability.id, ability]))

/** ability_id から能力を取得する。未登録は undefined。 */
export function getAbility(id: string): Ability | undefined {
  return CATALOG_BY_ID.get(id)
}
