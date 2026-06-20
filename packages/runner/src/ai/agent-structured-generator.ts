import { z, type ZodType } from 'zod/v4'
import type { GenerateOptions, StructuredGenerator } from './structured-generator.js'

/**
 * Claude Agent SDK（＝Claude Code）経由の構造化生成（要件5.1, 6.1）。
 *
 * 生の Anthropic API（従量課金・APIキー必須）ではなく、ForgeAgent と同じ
 * Agent SDK の `query()` を使うことで、サブスクのログイン認証に一本化する。
 * JSON Schema をプロンプトに埋めて JSON を生成させ、Zod で検証する。
 */

/** Agent SDK の query() と同形（構造化生成用・ツール不要）。注入・テスト用。 */
export type StructuredQueryLike = (params: {
  prompt: string
  options: { model: string; allowedTools: string[] }
}) => AsyncIterable<unknown>

export interface AgentStructuredGeneratorDeps {
  query: StructuredQueryLike
  /** 既定は claude-opus-4-8（design.md準拠）。 */
  model?: string
}

interface SdkTextMessage {
  type: string
  result?: string
  message?: { content?: Array<{ type: string; text?: string }> }
}

/** SDKメッセージ列から最終テキストを取り出す（result 優先、無ければ assistant text を連結）。 */
function collectText(messages: SdkTextMessage[]): string {
  const resultMessage = messages.find((m) => m.type === 'result' && typeof m.result === 'string')
  if (resultMessage?.result) {
    return resultMessage.result
  }
  const parts: string[] = []
  for (const message of messages) {
    if (message.type !== 'assistant') continue
    for (const block of message.message?.content ?? []) {
      if (block.type === 'text' && block.text) {
        parts.push(block.text)
      }
    }
  }
  return parts.join('\n')
}

/** ```json ... ``` フェンスや前後の散文を除いて JSON オブジェクト本体を取り出す。 */
function extractJsonObject(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  const body = fenced?.[1] ?? text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error('構造化出力にJSONオブジェクトが見つかりませんでした。')
  }
  return body.slice(start, end + 1)
}

const JSON_ONLY_SYSTEM =
  '出力はJSONオブジェクトのみとし、前後に説明・コードフェンス・文章を一切付けないこと。'

/** Agent SDK（サブスク認証）を用いた構造化生成器を生成する。 */
export function createAgentStructuredGenerator({
  query,
  model = 'claude-opus-4-8',
}: AgentStructuredGeneratorDeps): StructuredGenerator {
  return {
    async generate<T>(schema: ZodType<T>, options: GenerateOptions): Promise<T> {
      const jsonSchema = z.toJSONSchema(schema)
      const prompt = [
        options.system,
        JSON_ONLY_SYSTEM,
        '次のJSON Schemaに厳密に従ったJSONを生成すること:',
        JSON.stringify(jsonSchema),
        '',
        options.prompt,
      ]
        .filter((part): part is string => Boolean(part))
        .join('\n')

      const messages: SdkTextMessage[] = []
      // 構造化生成にツールは不要。allowedTools を空にしてテキスト生成に限定する。
      for await (const message of query({ prompt, options: { model, allowedTools: [] } })) {
        messages.push(message as SdkTextMessage)
      }

      const json = extractJsonObject(collectText(messages))
      let parsed: unknown
      try {
        parsed = JSON.parse(json)
      } catch (error) {
        throw new Error(
          `構造化出力のJSON解析に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      return schema.parse(parsed)
    },
  }
}
