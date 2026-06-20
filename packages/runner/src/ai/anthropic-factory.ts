import Anthropic from '@anthropic-ai/sdk'
import {
  createStructuredGenerator,
  type StructuredClient,
  type StructuredGenerator,
} from './structured-generator.js'

/** Anthropic API クライアントを生成する。APIキーはRunnerプロセス内のみで保持する。 */
export function createAnthropic(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}

/** 実 Anthropic クライアントを用いた構造化生成器を生成する。 */
export function createAnthropicStructuredGenerator(
  apiKey: string,
  model?: string,
): StructuredGenerator {
  return createStructuredGenerator({
    client: createAnthropic(apiKey) as unknown as StructuredClient,
    model,
  })
}
