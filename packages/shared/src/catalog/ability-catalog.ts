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
  {
    id: 'ability.debug-skill',
    kind: 'skill',
    ref: 'debugging',
    displayName: '千里眼',
    description: '失敗の根本原因を体系的に突き止めてから直す（systematic-debugging）。',
  },
  {
    id: 'ability.types-skill',
    kind: 'skill',
    ref: 'typescript',
    displayName: '型の鎧',
    description: '厳密な型付けで不正な状態を表現不能にする。',
  },
  {
    id: 'ability.coverage-skill',
    kind: 'skill',
    ref: 'coverage',
    displayName: '網羅の眼',
    description: '境界値・異常系まで網羅したテストを敷く。',
  },
  {
    id: 'ability.docs-skill',
    kind: 'skill',
    ref: 'documentation',
    displayName: '賢者の筆',
    description: '読み手に伝わる簡潔なドキュメント・コメントを残す。',
  },
  {
    id: 'ability.lint-plugin',
    kind: 'plugin',
    ref: 'lint',
    displayName: '静寂の篩',
    description: 'lint/フォーマットで一貫したコードに整える。',
  },
  {
    id: 'ability.git-skill',
    kind: 'skill',
    ref: 'git',
    displayName: '時渡りの腕輪',
    description: '小さく意味のあるコミットで履歴を読みやすく保つ。',
  },
  {
    id: 'ability.sqlite-mcp',
    kind: 'mcp',
    ref: 'sqlite',
    displayName: '記録の水晶',
    description: 'SQLite MCPでデータ層の確認・操作を強化する。',
  },
  {
    id: 'ability.playwright-mcp',
    kind: 'mcp',
    ref: 'playwright',
    displayName: '操り人形の糸',
    description: 'Playwright MCPでE2Eをブラウザ越しに検証する。',
  },
  {
    id: 'ability.arch-skill',
    kind: 'skill',
    ref: 'architecture',
    displayName: '設計者の羅針盤',
    description: '責務分割と境界を意識した拡張しやすい設計を選ぶ。',
  },
]

const CATALOG_BY_ID = new Map(ABILITY_CATALOG.map((ability) => [ability.id, ability]))

/** ability_id から能力を取得する。未登録は undefined。 */
export function getAbility(id: string): Ability | undefined {
  return CATALOG_BY_ID.get(id)
}
