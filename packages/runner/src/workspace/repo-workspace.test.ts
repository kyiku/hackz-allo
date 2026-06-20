import { describe, expect, it, vi } from 'vitest'
import { createRepoWorkspace } from './repo-workspace'
import type { WorkspaceGit } from './repo-workspace'

function fakeGit(overrides: Partial<WorkspaceGit> = {}): WorkspaceGit {
  return {
    fetch: vi.fn(async () => {}),
    addWorktree: vi.fn(async () => {}),
    removeWorktree: vi.fn(async () => {}),
    isClean: vi.fn(async () => true),
    ...overrides,
  }
}

describe('RepoWorkspace.prepare', () => {
  it('最新baseをfetch→origin/baseからworktree追加→依存インストールの順で実行', async () => {
    const git = fakeGit()
    const run = vi.fn(async () => {})
    const ws = createRepoWorkspace({ git, run })

    const result = await ws.prepare({
      baseBranch: 'main',
      workBranch: 'forge/issue-42-1',
      worktreePath: '/tmp/wt',
      install: { command: 'pnpm', args: ['install'] },
    })

    expect(git.fetch).toHaveBeenCalledWith('origin', 'main')
    expect(git.addWorktree).toHaveBeenCalledWith('/tmp/wt', 'forge/issue-42-1', 'origin/main')
    expect(run).toHaveBeenCalledWith('pnpm', ['install'], '/tmp/wt')
    expect(result).toEqual({ path: '/tmp/wt', branch: 'forge/issue-42-1' })
  })

  it('installを省略するとコマンドを実行しない', async () => {
    const git = fakeGit()
    const run = vi.fn(async () => {})
    await createRepoWorkspace({ git, run }).prepare({
      baseBranch: 'main',
      workBranch: 'b',
      worktreePath: '/tmp/wt',
    })
    expect(run).not.toHaveBeenCalled()
  })
})

describe('RepoWorkspace.assertClean', () => {
  it('クリーンなら通る', async () => {
    const ws = createRepoWorkspace({ git: fakeGit({ isClean: vi.fn(async () => true) }), run: vi.fn() })
    await expect(ws.assertClean('/tmp/wt')).resolves.toBeUndefined()
  })

  it('dirtyなら例外を投げる', async () => {
    const ws = createRepoWorkspace({ git: fakeGit({ isClean: vi.fn(async () => false) }), run: vi.fn() })
    await expect(ws.assertClean('/tmp/wt')).rejects.toThrow(/未コミット/)
  })
})

describe('RepoWorkspace.cleanup', () => {
  it('worktreeを撤去する', async () => {
    const git = fakeGit()
    await createRepoWorkspace({ git, run: vi.fn() }).cleanup('/tmp/wt')
    expect(git.removeWorktree).toHaveBeenCalledWith('/tmp/wt')
  })
})
