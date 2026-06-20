import { describe, expect, it, vi } from 'vitest'
import { buildForgeOptions, runForge } from './forge-agent'
import type { QueryLike } from './forge-agent'

describe('buildForgeOptions', () => {
  it('既定で claude-opus-4-8 と worktree cwd、最小ツール許可を返す', () => {
    const opts = buildForgeOptions({ worktreePath: '/tmp/wt' })
    expect(opts.model).toBe('claude-opus-4-8')
    expect(opts.cwd).toBe('/tmp/wt')
    expect(opts.allowedTools).toEqual(['Read', 'Edit', 'Write', 'Bash'])
  })

  it('model を上書きできる', () => {
    expect(buildForgeOptions({ worktreePath: '/tmp/wt', model: 'claude-haiku-4-5' }).model).toBe(
      'claude-haiku-4-5',
    )
  })

  it('injection を渡すと mcpServers/settingSources を併合する', () => {
    const opts = buildForgeOptions({
      worktreePath: '/tmp/wt',
      injection: {
        mcpServers: { github: { type: 'http', url: 'https://example/mcp' } },
        settingSources: ['user'],
      },
    })
    expect(opts.mcpServers).toEqual({ github: { type: 'http', url: 'https://example/mcp' } })
    expect(opts.settingSources).toEqual(['user'])
    // 既存フィールドは維持される
    expect(opts.allowedTools).toEqual(['Read', 'Edit', 'Write', 'Bash'])
  })

  it('injection 未指定なら注入フィールドは付かない', () => {
    const opts = buildForgeOptions({ worktreePath: '/tmp/wt' })
    expect(opts.mcpServers).toBeUndefined()
    expect(opts.settingSources).toBeUndefined()
  })
})

async function* fakeMessages() {
  yield { type: 'assistant', text: 'a' }
  yield { type: 'result', subtype: 'success' }
}

describe('runForge', () => {
  it('query を worktree オプション付きで呼び、メッセージを順に yield する', async () => {
    const query = vi.fn(() => fakeMessages()) as unknown as QueryLike
    const received: unknown[] = []
    for await (const msg of runForge({ query, prompt: 'TDDで実装して', worktreePath: '/tmp/wt' })) {
      received.push(msg)
    }
    expect(received).toHaveLength(2)
    const callArg = (query as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg.prompt).toBe('TDDで実装して')
    expect(callArg.options.cwd).toBe('/tmp/wt')
    expect(callArg.options.model).toBe('claude-opus-4-8')
  })

  it('injection を options へ透過して query に渡す', async () => {
    const query = vi.fn(() => fakeMessages()) as unknown as QueryLike
    for await (const _ of runForge({
      query,
      prompt: 'p',
      worktreePath: '/tmp/wt',
      injection: { settingSources: ['user'] },
    })) {
      // drain
    }
    const callArg = (query as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(callArg.options.settingSources).toEqual(['user'])
  })
})
