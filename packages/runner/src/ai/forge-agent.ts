/**
 * ForgeAgent: 鍛冶屋のTDD実行を Claude Agent SDK の `query()` で駆動する。
 * Anthropic API(構造化出力)とはAPIを分離する（design.md準拠）。
 */

/** query() に渡す Forge 用オプション（SDK Options のサブセット）。 */
export interface ForgeOptions {
  model: string
  cwd: string
  allowedTools: string[]
}

export interface BuildForgeOptionsParams {
  worktreePath: string
  /** 既定は claude-opus-4-8。 */
  model?: string
}

const FORGE_ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Bash'] as const

/** ForgeAgent の query オプションを組み立てる。cwd は使い捨て worktree を指定する。 */
export function buildForgeOptions({ worktreePath, model = 'claude-opus-4-8' }: BuildForgeOptionsParams): ForgeOptions {
  return {
    model,
    cwd: worktreePath,
    allowedTools: [...FORGE_ALLOWED_TOOLS],
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
}

/**
 * ForgeAgent を起動し、SDKメッセージを逐次 yield する。
 * 受け取ったメッセージのRPG風ログへの変換はタスク4.4で行う。
 */
export async function* runForge({ query, prompt, worktreePath, model }: RunForgeParams): AsyncGenerator<unknown> {
  const options = buildForgeOptions({ worktreePath, model })
  for await (const message of query({ prompt, options })) {
    yield message
  }
}
