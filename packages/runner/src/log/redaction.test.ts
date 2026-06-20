import { describe, expect, it } from 'vitest'
import { redactSecrets } from './redaction'

describe('redactSecrets', () => {
  it('GitHub PAT(ghp_)を除去する', () => {
    expect(redactSecrets('token ghp_abcdefghij1234567890ABCD')).not.toContain('ghp_abcdefghij')
    expect(redactSecrets('ghp_abcdefghij1234567890ABCD')).toContain('[REDACTED]')
  })

  it('Anthropic APIキー(sk-ant-)を除去する', () => {
    expect(redactSecrets('key=sk-ant-api03-XYZ_abc-123')).toContain('[REDACTED]')
    expect(redactSecrets('sk-ant-api03-XYZ_abc-123')).not.toContain('XYZ_abc')
  })

  it('環境変数の値を除去しキー名は残す', () => {
    expect(redactSecrets('ANTHROPIC_API_KEY=supersecret')).toBe('ANTHROPIC_API_KEY=[REDACTED]')
    expect(redactSecrets('GITHUB_PAT=abc123')).toBe('GITHUB_PAT=[REDACTED]')
  })

  it('Bearer トークンを除去する', () => {
    expect(redactSecrets('Authorization: Bearer abc.def.ghi')).toBe('Authorization: Bearer [REDACTED]')
  })

  it('通常のログは変更しない', () => {
    expect(redactSecrets('テスト t1 が pass しました')).toBe('テスト t1 が pass しました')
  })
})
