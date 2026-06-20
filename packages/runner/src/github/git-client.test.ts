import { describe, expect, it, vi } from 'vitest'
import { createGitClient } from './git-client'
import type { SimpleGitLike } from './git-client'

function fakeGit() {
  return {
    checkoutLocalBranch: vi.fn(async () => {}),
    add: vi.fn(async () => {}),
    commit: vi.fn(async () => {}),
    push: vi.fn(async () => {}),
  } satisfies SimpleGitLike
}

describe('GitClient.createWorkBranch', () => {
  it('forge/issue-<n>-<ts> 形式のブランチを作成しチェックアウトする', async () => {
    const git = fakeGit()
    const client = createGitClient({ git })
    const branch = await client.createWorkBranch(42, 1700000000)
    expect(branch).toBe('forge/issue-42-1700000000')
    expect(git.checkoutLocalBranch).toHaveBeenCalledWith('forge/issue-42-1700000000')
  })
})

describe('GitClient.commitAll', () => {
  it('全変更をステージしてコミットする', async () => {
    const git = fakeGit()
    await createGitClient({ git }).commitAll('feat: x')
    expect(git.add).toHaveBeenCalledWith('.')
    expect(git.commit).toHaveBeenCalledWith('feat: x')
  })
})

describe('GitClient.push（main直push禁止）', () => {
  it('作業ブランチは origin に push する', async () => {
    const git = fakeGit()
    await createGitClient({ git }).push('forge/issue-42-1700000000')
    expect(git.push).toHaveBeenCalledWith('origin', 'forge/issue-42-1700000000')
  })

  it('main への直接 push を拒否する', async () => {
    const git = fakeGit()
    await expect(createGitClient({ git }).push('main')).rejects.toThrow(/main/)
    expect(git.push).not.toHaveBeenCalled()
  })

  it('master への直接 push も拒否する', async () => {
    const git = fakeGit()
    await expect(createGitClient({ git }).push('master')).rejects.toThrow()
  })
})
