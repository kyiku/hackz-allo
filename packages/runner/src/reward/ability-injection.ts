import { getAbility } from '@github-issue-rpg/shared'

/**
 * 装備能力の種別振り分け（要件5.8）。
 * 装備中の固定カタログ能力を mcp/skill/plugin の ref 群に分類する。
 * これを実 SDK オプションへ解決するのは ability-sdk.ts の resolveAbilitySdkOptions。
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
