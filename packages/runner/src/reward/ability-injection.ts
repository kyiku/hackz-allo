import { getAbility } from '@github-issue-rpg/shared'
import { buildForgeOptions, type ForgeOptions } from '../ai/forge-agent.js'

/**
 * 装備能力の ForgeAgent 反映（要件5.8）。
 * 装備中の固定カタログ能力を、次回 query() の mcpServers/skills/plugins に注入する。
 * 「装備で次戦の挙動が実際に変わる」をカタログ参照で成立させる。
 */

export interface AbilityInjection {
  mcpServers: string[]
  skills: string[]
  plugins: string[]
}

/** abilityId 群をカタログ種別ごとに mcpServers/skills/plugins へ振り分ける。 */
export function buildAbilityInjection(abilityIds: readonly string[]): AbilityInjection {
  const injection: AbilityInjection = { mcpServers: [], skills: [], plugins: [] }
  for (const id of abilityIds) {
    const ability = getAbility(id)
    if (!ability) {
      continue
    }
    switch (ability.kind) {
      case 'mcp':
        injection.mcpServers.push(ability.ref)
        break
      case 'skill':
        injection.skills.push(ability.ref)
        break
      case 'plugin':
        injection.plugins.push(ability.ref)
        break
    }
  }
  return injection
}

/** 装備能力を注入した query() 用オプションを生成する。 */
export interface ForgeOptionsWithAbilities extends ForgeOptions, AbilityInjection {}

export interface BuildForgeOptionsWithAbilitiesParams {
  worktreePath: string
  abilityIds: readonly string[]
  model?: string
}

/** ForgeOptions（cwd/model/allowedTools）に装備能力の注入を併せて構築する。 */
export function buildForgeOptionsWithAbilities({
  worktreePath,
  abilityIds,
  model,
}: BuildForgeOptionsWithAbilitiesParams): ForgeOptionsWithAbilities {
  const base = buildForgeOptions({ worktreePath, model })
  const injection = buildAbilityInjection(abilityIds)
  return { ...base, ...injection }
}
