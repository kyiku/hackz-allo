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
  {
    id: 'ability.security-skill',
    kind: 'skill',
    ref: 'security-review',
    displayName: '防壁の心得',
    description: '入力検証・インジェクション対策など安全側の実装を徹底する。',
  },
  {
    id: 'ability.perf-skill',
    kind: 'skill',
    ref: 'performance',
    displayName: '俊足の心得',
    description: '無駄な確保やループを避け、性能を意識した実装を促す。',
  },
  {
    id: 'ability.context7-mcp',
    kind: 'mcp',
    ref: 'context7',
    displayName: '叡智の書物',
    description: 'context7 MCPで最新ライブラリ知識を参照して実装精度を上げる。',
  },
]

const CATALOG_BY_ID = new Map(ABILITY_CATALOG.map((ability) => [ability.id, ability]))

/** ability_id から能力を取得する。未登録は undefined。 */
export function getAbility(id: string): Ability | undefined {
  return CATALOG_BY_ID.get(id)
}
