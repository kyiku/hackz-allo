import { describe, expect, it } from 'vitest'
import { messageToBattleLogs } from './forge-events'

describe('messageToBattleLogs', () => {
  it('assistantのテキストを info ログにする', () => {
    const logs = messageToBattleLogs({
      type: 'assistant',
      message: { content: [{ type: 'text', text: '実装を進めます' }] },
    })
    expect(logs).toEqual([{ line: '実装を進めます', kind: 'info' }])
  })

  it('Write/Edit の tool_use を attack ログにする', () => {
    const logs = messageToBattleLogs({
      type: 'assistant',
      message: {
        content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'src/a.ts' } }],
      },
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]?.kind).toBe('attack')
    expect(logs[0]?.line).toContain('src/a.ts')
  })

  it('Bash の tool_use を info ログにしコマンドを含める', () => {
    const logs = messageToBattleLogs({
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'pnpm test' } }] },
    })
    expect(logs[0]?.kind).toBe('info')
    expect(logs[0]?.line).toContain('pnpm test')
  })

  it('result(success) を system ログにする', () => {
    const logs = messageToBattleLogs({ type: 'result', subtype: 'success' })
    expect(logs[0]?.kind).toBe('system')
  })

  it('空テキストは無視する', () => {
    const logs = messageToBattleLogs({
      type: 'assistant',
      message: { content: [{ type: 'text', text: '   ' }] },
    })
    expect(logs).toEqual([])
  })

  it('複数ブロックを順に変換する', () => {
    const logs = messageToBattleLogs({
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'まずテストを読む' },
          { type: 'tool_use', name: 'Read', input: { file_path: 'a.test.ts' } },
        ],
      },
    })
    expect(logs).toHaveLength(2)
  })
})
