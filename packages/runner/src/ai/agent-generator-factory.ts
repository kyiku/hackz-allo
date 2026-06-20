import { query } from '@anthropic-ai/claude-agent-sdk'
import {
  createAgentStructuredGenerator,
  type StructuredQueryLike,
} from './agent-structured-generator.js'
import type { StructuredGenerator } from './structured-generator.js'

/**
 * 実 Claude Agent SDK の `query` を用いた構造化生成器（サブスク認証）。
 * APIキー不要。ForgeAgent と同じ認証経路で構造化生成も行う。
 */
export function createAgentStructuredGeneratorWithSdk(model?: string): StructuredGenerator {
  return createAgentStructuredGenerator({
    query: query as unknown as StructuredQueryLike,
    model,
  })
}
