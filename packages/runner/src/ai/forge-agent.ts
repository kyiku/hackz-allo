/**
 * ForgeAgent: 鍛冶屋のTDD実行を Claude Agent SDK の `query()` で駆動する。
 * Anthropic API(構造化出力)とはAPIを分離する（design.md準拠）。
 */

import type {
  AgentDefinition,
  McpServerConfig,
  SdkPluginConfig,
  SettingSource,
} from '@anthropic-ai/claude-agent-sdk'

/** query() に渡す Forge 用オプション（SDK Options のサブセット）。 */
export interface ForgeOptions {
  model: string
  cwd: string
  allowedTools: string[]
  /** 装備MCPの実体注入（ref→config）。未指定なら注入なし。 */
  mcpServers?: Record<string, McpServerConfig>
  /** サブエージェント定義の注入。未指定なら注入なし。 */
  agents?: Record<string, AgentDefinition>
  /** ローカルプラグインの注入。未指定なら注入なし。 */
  plugins?: SdkPluginConfig[]
  /** skill/plugin をディスクから読み込む設定ソース。未指定なら読み込まない。 */
  settingSources?: SettingSource[]
}

/** buildForgeOptions に渡す追加注入（装備能力由来）。すべて任意。 */
export type ForgeInjection = Pick<ForgeOptions, 'mcpServers' | 'agents' | 'plugins' | 'settingSources'>

export interface BuildForgeOptionsParams {
  worktreePath: string
  /** 既定は claude-opus-4-8。 */
  model?: string
  /** 装備能力の注入断片（FORGE_ABILITY_INJECTION 有効時のみ渡る）。 */
  injection?: ForgeInjection
}

const FORGE_ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Bash'] as const

/** ForgeAgent の query オプションを組み立てる。cwd は使い捨て worktree を指定する。 */
export function buildForgeOptions({
  worktreePath,
  model = 'claude-opus-4-8',
  injection,
}: BuildForgeOptionsParams): ForgeOptions {
  return {
    model,
    cwd: worktreePath,
    allowedTools: [...FORGE_ALLOWED_TOOLS],
    ...(injection ?? {}),
  }
}

/** Claude Agent SDK の `query` と同形の関数（注入・テスト用）。 */
export type QueryLike = (params: {
  prompt: string | AsyncIterable<unknown>
  options: ForgeOptions
}) => AsyncIterable<unknown>

export interface RunForgeParams {
  query: QueryLike
  prompt: string | AsyncIterable<unknown>
  worktreePath: string
  model?: string
  /** 装備能力の注入断片（FORGE_ABILITY_INJECTION 有効時のみ渡る）。 */
  injection?: ForgeInjection
}

/**
 * ForgeAgent を起動し、SDKメッセージを逐次 yield する。
 * 受け取ったメッセージのRPG風ログへの変換はタスク4.4で行う。
 */
export async function* runForge({
  query,
  prompt,
  worktreePath,
  model,
  injection,
}: RunForgeParams): AsyncGenerator<unknown> {
  const options = buildForgeOptions({ worktreePath, model, injection })
  for await (const message of query({ prompt, options })) {
    yield message
  }
}
