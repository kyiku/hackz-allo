import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createWorkLogRepository, saveWorkLog } from './work-log-repository'

describe('WorkLogRepository', () => {
  it('ログを保存し battleId で取得できる', () => {
    const repo = createWorkLogRepository(createDatabase(':memory:'))
    repo.create({ battleId: 'b1', line: '実装開始', createdAt: '2026-06-20T00:00:00.000Z' })
    repo.create({ battleId: 'b1', line: '実装完了', createdAt: '2026-06-20T00:01:00.000Z' })
    const logs = repo.listByBattle('b1')
    expect(logs).toHaveLength(2)
    expect(logs[0]?.line).toBe('実装開始')
  })
})

describe('saveWorkLog', () => {
  it('秘密情報をredactionしてから保存する', () => {
    const repo = createWorkLogRepository(createDatabase(':memory:'))
    saveWorkLog(repo, { battleId: 'b1', line: 'GITHUB_PAT=ghp_abcdefghij1234567890ABCD で認証', now: '2026-06-20T00:00:00.000Z' })
    const logs = repo.listByBattle('b1')
    expect(logs[0]?.line).not.toContain('ghp_abcdefghij')
    expect(logs[0]?.line).toContain('[REDACTED]')
  })
})
