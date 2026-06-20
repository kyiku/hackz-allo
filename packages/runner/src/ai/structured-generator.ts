import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
// 構造化出力ヘルパ(zodOutputFormat)は zod/v4 のスキーマを要求するため v4 を用いる。
// shared パッケージの v3 ドメインスキーマ(WS/DB検証用)とは用途を分離する。
import type { ZodType } from 'zod/v4'

/** Anthropic SDK のうち構造化出力に使うメソッドだけを抽出した型（注入・テスト用）。 */
export interface StructuredClient {
  messages: {
    parse(params: {
      model: string
      max_tokens: number
      system?: string
      messages: Array<{ role: 'user'; content: string }>
      output_config: { format: unknown }
      thinking?: { type: 'adaptive' }
    }): Promise<{ parsed_output: unknown }>
  }
}

export interface StructuredGeneratorDeps {
  client: StructuredClient
  /** 既定は claude-opus-4-8（design.md準拠）。 */
  model?: string
  maxTokens?: number
}

export interface GenerateOptions {
  prompt: string
  system?: string
}

export interface StructuredGenerator {
  generate<T>(schema: ZodType<T>, options: GenerateOptions): Promise<T>
}

/**
 * Anthropic API（`@anthropic-ai/sdk`）の構造化出力ラッパ。
 * 敵ステータスや報酬など、Zodスキーマに沿った構造化生成を行う。
 * ForgeAgent(Claude Agent SDK)とはAPIを分離する。
 */
export function createStructuredGenerator({
  client,
  model = 'claude-opus-4-8',
  maxTokens = 4096,
}: StructuredGeneratorDeps): StructuredGenerator {
  return {
    async generate<T>(schema: ZodType<T>, options: GenerateOptions): Promise<T> {
      const response = await client.messages.parse({
        model,
        max_tokens: maxTokens,
        thinking: { type: 'adaptive' },
        ...(options.system ? { system: options.system } : {}),
        messages: [{ role: 'user', content: options.prompt }],
        output_config: { format: zodOutputFormat(schema) },
      })
      if (response.parsed_output === null || response.parsed_output === undefined) {
        throw new Error('構造化出力の取得に失敗しました（parsed_output が空）。')
      }
      return response.parsed_output as T
    },
  }
}
