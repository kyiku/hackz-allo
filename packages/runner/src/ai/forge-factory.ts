import { query } from '@anthropic-ai/claude-agent-sdk'
import { runForge, type QueryLike, type RunForgeParams } from './forge-agent.js'

/** 実 Claude Agent SDK の `query` を用いて ForgeAgent を起動する。 */
export function runForgeWithSdk(params: Omit<RunForgeParams, 'query'>): AsyncGenerator<unknown> {
  return runForge({ ...params, query: query as unknown as QueryLike })
}
