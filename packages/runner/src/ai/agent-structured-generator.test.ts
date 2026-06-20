import { describe, expect, it } from 'vitest'
import { z } from 'zod/v4'
import { createAgentStructuredGenerator, type StructuredQueryLike } from './agent-structured-generator'

const enemyStatsSchema = z.object({ hp: z.number(), weakness: z.string() })

/** 与えたメッセージ列を返す query モック。 */
function fakeQuery(messages: unknown[]): { query: StructuredQueryLike; calls: { prompt: string; options: { model: string; allowedTools: string[] } }[] } {
  const calls: { prompt: string; options: { model: string; allowedTools: string[] } }[] = []
  const query: StructuredQueryLike = ({ prompt, options }) => {
    calls.push({ prompt, options })
    return (async function* () {
      for (const m of messages) yield m
    })()
  }
  return { query, calls }
}

function resultMessage(text: string) {
  return { type: 'result', subtype: 'success', result: text }
}

function assistantMessage(text: string) {
  return { type: 'assistant', message: { content: [{ type: 'text', text }] } }
}

describe('createAgentStructuredGenerator.generate', () => {
  it('result メッセージのJSONを検証して返す', async () => {
    const { query } = fakeQuery([resultMessage('{"hp": 5, "weakness": "null-check"}')])
    const gen = createAgentStructuredGenerator({ query })
    expect(await gen.generate(enemyStatsSchema, { prompt: '敵を生成' })).toEqual({
      hp: 5,
      weakness: 'null-check',
    })
  })

  it('assistant テキスト（result 無し）からも取り出す', async () => {
    const { query } = fakeQuery([assistantMessage('{"hp": 3, "weakness": "race"}')])
    const result = await createAgentStructuredGenerator({ query }).generate(enemyStatsSchema, {
      prompt: 'p',
    })
    expect(result).toEqual({ hp: 3, weakness: 'race' })
  })

  it('コードフェンスや前後の散文があってもJSONを抽出する', async () => {
    const { query } = fakeQuery([
      resultMessage('はい、生成しました:\n```json\n{"hp": 2, "weakness": "off-by-one"}\n```\n以上です。'),
    ])
    const result = await createAgentStructuredGenerator({ query }).generate(enemyStatsSchema, {
      prompt: 'p',
    })
    expect(result).toEqual({ hp: 2, weakness: 'off-by-one' })
  })

  it('プロンプトにJSON Schemaを埋め、ツール無し・model指定でqueryを呼ぶ', async () => {
    const { query, calls } = fakeQuery([resultMessage('{"hp": 1, "weakness": "x"}')])
    await createAgentStructuredGenerator({ query, model: 'claude-haiku-4-5' }).generate(
      enemyStatsSchema,
      { system: 'あなたはGM', prompt: '敵を作れ' },
    )
    expect(calls[0].options).toEqual({ model: 'claude-haiku-4-5', allowedTools: [] })
    expect(calls[0].prompt).toContain('あなたはGM')
    expect(calls[0].prompt).toContain('敵を作れ')
    // JSON Schema（properties: hp/weakness）が埋め込まれていること
    expect(calls[0].prompt).toContain('weakness')
    expect(calls[0].prompt).toContain('properties')
  })

  it('JSONが見つからなければ例外を投げる', async () => {
    const { query } = fakeQuery([resultMessage('生成できませんでした')])
    await expect(
      createAgentStructuredGenerator({ query }).generate(enemyStatsSchema, { prompt: 'p' }),
    ).rejects.toThrow(/JSONオブジェクト/)
  })

  it('スキーマに合わない出力は Zod 検証で弾く', async () => {
    const { query } = fakeQuery([resultMessage('{"hp": "five", "weakness": "x"}')])
    await expect(
      createAgentStructuredGenerator({ query }).generate(enemyStatsSchema, { prompt: 'p' }),
    ).rejects.toThrow()
  })
})
