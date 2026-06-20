import { describe, expect, it } from 'vitest'
import { isLikelyRepoUrl, normalizeRepoUrl } from './url'

describe('isLikelyRepoUrl', () => {
  it('owner/repo を持つ github URL を受理する', () => {
    expect(isLikelyRepoUrl('https://github.com/kyiku/hackz-allo')).toBe(true)
    expect(isLikelyRepoUrl('https://github.com/kyiku/hackz-allo.git')).toBe(true)
  })

  it('http や非githubホストを拒否する', () => {
    expect(isLikelyRepoUrl('http://github.com/a/b')).toBe(false)
    expect(isLikelyRepoUrl('https://gitlab.com/a/b')).toBe(false)
  })

  it('owner/repo に満たないパスを拒否する', () => {
    expect(isLikelyRepoUrl('https://github.com/onlyowner')).toBe(false)
  })

  it('owner/repo より深いパス（/tree/main 等）は拒否する', () => {
    expect(isLikelyRepoUrl('https://github.com/kyiku/hackz-allo/tree/main')).toBe(false)
    expect(isLikelyRepoUrl('https://github.com/kyiku/hackz-allo/issues/1')).toBe(false)
  })

  it('URLとして不正な入力を拒否する', () => {
    expect(isLikelyRepoUrl('not a url')).toBe(false)
    expect(isLikelyRepoUrl('')).toBe(false)
  })
})

describe('normalizeRepoUrl', () => {
  it('末尾スラッシュと .git を除去して owner/repo の正規形を返す', () => {
    expect(normalizeRepoUrl('https://github.com/kyiku/hackz-allo/')).toBe(
      'https://github.com/kyiku/hackz-allo',
    )
    expect(normalizeRepoUrl('  https://github.com/kyiku/hackz-allo.git ')).toBe(
      'https://github.com/kyiku/hackz-allo',
    )
  })

  it('.git と末尾スラッシュの複合ケースも正規化する', () => {
    expect(normalizeRepoUrl('https://github.com/kyiku/hackz-allo.git/')).toBe(
      'https://github.com/kyiku/hackz-allo',
    )
  })

  it('不正なURLは例外を投げる', () => {
    expect(() => normalizeRepoUrl('not a url')).toThrow()
  })
})
