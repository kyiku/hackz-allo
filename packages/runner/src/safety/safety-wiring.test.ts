import { describe, expect, it, vi } from 'vitest'
import { createDatabase } from '../db/database'
import {
  buildCanUseTool,
  createGitClient,
  createWorkLogRepository,
  emergencyStop,
  saveWorkLog,
} from './index'

/**
 * 安全要件の通し動作確認（要件6.1）。
 * 4つの安全機能が結線され、それぞれの不変条件が成立することを検証する。
 */
describe('安全要件の結線', () => {
  it('main直push禁止: 保護ブランチへの直接pushを拒否する', async () => {
    const git = {
      checkoutLocalBranch: vi.fn(async () => {}),
      add: vi.fn(async () => {}),
      commit: vi.fn(async () => {}),
      push: vi.fn(async () => {}),
    }
    const client = createGitClient({ git })
    await expect(client.push('main')).rejects.toThrow(/main/)
    expect(git.push).not.toHaveBeenCalled()
    // 作業ブランチは許可
    await client.push('forge/issue-1-1')
    expect(git.push).toHaveBeenCalledWith('origin', 'forge/issue-1-1')
  })

  it('コマンド制限: 破壊的コマンドを deny、安全なものは allow', async () => {
    const canUse = buildCanUseTool('/tmp/wt')
    expect((await canUse('Bash', { command: 'rm -rf /' })).behavior).toBe('deny')
    expect((await canUse('Bash', { command: 'pnpm test' })).behavior).toBe('allow')
    expect((await canUse('Write', { file_path: '/etc/passwd', content: 'x' })).behavior).toBe('deny')
  })

  it('作業ログ: 秘密情報を redaction して保存する', () => {
    const repo = createWorkLogRepository(createDatabase(':memory:'))
    saveWorkLog(repo, {
      battleId: 'b1',
      line: 'export GITHUB_PAT=ghp_abcdefghij1234567890ABCD',
      now: '2026-06-20T00:00:00.000Z',
    })
    const logs = repo.listByBattle('b1')
    expect(logs[0]?.line).toContain('[REDACTED]')
    expect(logs[0]?.line).not.toContain('ghp_abcdefghij')
  })

  it('緊急停止: 実行中エージェントを即座に中断する', async () => {
    const interrupt = vi.fn(async () => {})
    await emergencyStop({ interrupt })
    expect(interrupt).toHaveBeenCalledOnce()
  })
})
