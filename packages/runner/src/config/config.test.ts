import { describe, expect, it } from 'vitest'
import { loadConfig } from './config'

const validEnv = {
  GITHUB_PAT: 'ghp_xxx',
  ANTHROPIC_API_KEY: 'sk-ant-xxx',
}

describe('loadConfig', () => {
  it('有効な環境変数から設定を生成する', () => {
    expect(loadConfig(validEnv)).toEqual({
      githubPat: 'ghp_xxx',
      anthropicApiKey: 'sk-ant-xxx',
    })
  })

  it('GITHUB_PAT が無ければ変数名を含むエラーを投げる', () => {
    expect(() => loadConfig({ ANTHROPIC_API_KEY: 'sk-ant-xxx' })).toThrow(/GITHUB_PAT/)
  })

  it('ANTHROPIC_API_KEY が無ければ変数名を含むエラーを投げる', () => {
    expect(() => loadConfig({ GITHUB_PAT: 'ghp_xxx' })).toThrow(/ANTHROPIC_API_KEY/)
  })

  it('空文字の秘密情報を拒否する', () => {
    expect(() => loadConfig({ ...validEnv, GITHUB_PAT: '' })).toThrow(/GITHUB_PAT/)
  })

  it('未知の環境変数は無視する', () => {
    expect(loadConfig({ ...validEnv, UNRELATED: 'x' }).githubPat).toBe('ghp_xxx')
  })
})
