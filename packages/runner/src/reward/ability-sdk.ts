import type { McpServerConfig, SettingSource } from '@anthropic-ai/claude-agent-sdk'
import type { AbilityInjection } from './ability-injection.js'

/**
 * 装備能力（AbilityInjection）を Claude Agent SDK の query() オプション断片へ解決する。
 *
 * 実態に忠実な変換:
 * - mcp: bare名（'github' 等）では query() が解決できないため、ref→実 McpServerConfig の
 *   登録表（既定は env FORGE_MCP_REGISTRY のJSON）に載っている ref のみを実体注入する。未登録は無視。
 * - skill/plugin: SDKに「名前でskillを個別有効化する」APIは存在しないため、装備に
 *   skill/plugin があれば settingSources を有効化し、ディスク上の実skill/pluginを読み込ませる。
 */

/** query() に渡す注入断片（定義済みのフィールドのみ含む）。 */
export interface AbilitySdkOptions {
  mcpServers?: Record<string, McpServerConfig>
  settingSources?: SettingSource[]
}

/**
 * env(FORGE_MCP_REGISTRY) を ref→McpServerConfig として読む。
 * 未設定・不正JSON・非オブジェクトは空表（=MCPは何も注入されない）にフォールバックする。
 */
export function mcpRegistryFromEnv(
  raw: string | undefined = process.env.FORGE_MCP_REGISTRY,
): Record<string, McpServerConfig> {
  if (!raw) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, McpServerConfig>
    }
    return {}
  } catch (error) {
    console.error('[runner] FORGE_MCP_REGISTRY のJSON解析に失敗しました。MCP注入を無効化します:', error)
    return {}
  }
}

/** MCP ref 配列を registry で実 config へ解決する。該当ゼロなら undefined。 */
export function resolveMcpServers(
  refs: readonly string[],
  registry: Record<string, McpServerConfig> = mcpRegistryFromEnv(),
): Record<string, McpServerConfig> | undefined {
  const entries = refs
    .map((ref) => [ref, registry[ref]] as const)
    .filter((e): e is readonly [string, McpServerConfig] => e[1] !== undefined)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

/** skill/plugin をディスクから読み込む設定ソース。ユーザーローカルのみ（クローン先repo設定の実行は避ける）。 */
const SKILL_SETTING_SOURCES: readonly SettingSource[] = ['user']

/**
 * AbilityInjection を query() 用の SDK オプション断片へ解決する。
 * registry に無い mcp ref はスキップ、skill/plugin があれば settingSources を立てる。
 */
export function resolveAbilitySdkOptions(
  injection: AbilityInjection,
  registry: Record<string, McpServerConfig> = mcpRegistryFromEnv(),
): AbilitySdkOptions {
  const result: AbilitySdkOptions = {}

  const mcpEntries = injection.mcpServers
    .map((ref) => [ref, registry[ref]] as const)
    .filter((entry): entry is readonly [string, McpServerConfig] => entry[1] !== undefined)
  if (mcpEntries.length > 0) {
    result.mcpServers = Object.fromEntries(mcpEntries)
  }

  if (injection.skills.length > 0 || injection.plugins.length > 0) {
    result.settingSources = [...SKILL_SETTING_SOURCES]
  }

  return result
}
