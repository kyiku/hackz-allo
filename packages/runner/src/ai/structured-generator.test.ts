import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { createStructuredGenerator } from './structured-generator'
import type { StructuredClient } from './structured-generator'

const enemyStatsSchema = z.object({ hp: z.number(), weakness: z.string() })

function fakeClient(parsedOutput: unknown): { client: StructuredClient; parse: ReturnType<typeof vi.fn> } {
  const parse = vi.fn(async () => ({ parsed_output: parsedOutput }))
  return { client: { messages: { parse } } as unknown as StructuredClient, parse }
}

describe('StructuredGenerator.generate', () => {
  it('parsed_output を返す', async () => {
    const { client } = fakeClient({ hp: 5, weakness: 'null-check' })
    const gen = createStructuredGenerator({ client })
    const result = await gen.generate(enemyStatsSchema, { prompt: '敵を生成' })
    expect(result).toEqual({ hp: 5, weakness: 'null-check' })
  })

  it('model=claude-opus-4-8 と output_config.format を渡す', async () => {
    const { client, parse } = fakeClient({ hp: 1, weakness: 'x' })
    await createStructuredGenerator({ client }).generate(enemyStatsSchema, {
      system: 'システム',
      prompt: 'ユーザー',
    })
    const arg = parse.mock.calls[0][0]
    expect(arg.model).toBe('claude-opus-4-8')
    expect(arg.output_config?.format).toBeDefined()
    expect(arg.system).toBe('システム')
    expect(arg.messages).toEqual([{ role: 'user', content: 'ユーザー' }])
  })

  it('モデルとmax_tokensを上書きできる', async () => {
    const { client, parse } = fakeClient({ hp: 1, weakness: 'x' })
    await createStructuredGenerator({ client, model: 'claude-haiku-4-5', maxTokens: 256 }).generate(
      enemyStatsSchema,
      { prompt: 'p' },
    )
    expect(parse.mock.calls[0][0].model).toBe('claude-haiku-4-5')
    expect(parse.mock.calls[0][0].max_tokens).toBe(256)
  })

  it('parsed_output が null なら例外を投げる', async () => {
    const { client } = fakeClient(null)
    await expect(
      createStructuredGenerator({ client }).generate(enemyStatsSchema, { prompt: 'p' }),
    ).rejects.toThrow(/構造化出力/)
  })
})
