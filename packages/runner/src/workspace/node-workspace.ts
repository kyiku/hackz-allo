import { spawn } from 'node:child_process'
import { simpleGit } from 'simple-git'
import type { CommandRunner, WorkspaceGit } from './repo-workspace.js'

/** simple-git を用いた WorkspaceGit 実装。 */
export function createWorkspaceGit(repoPath: string): WorkspaceGit {
  const git = simpleGit(repoPath)
  return {
    async fetch(remote, branch) {
      await git.fetch(remote, branch)
    },
    async addWorktree(worktreePath, branch, baseRef) {
      await git.raw(['worktree', 'add', '-b', branch, worktreePath, baseRef])
    },
    async removeWorktree(worktreePath) {
      await git.raw(['worktree', 'remove', worktreePath, '--force'])
    },
    async isClean(worktreePath) {
      const status = await simpleGit(worktreePath).status()
      return status.isClean()
    },
  }
}

/**
 * child_process.spawn ベースのコマンド実行。
 * CI=true でインタラクティブ出力を抑制する。非ゼロ終了は例外。
 */
export const nodeCommandRunner: CommandRunner = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, [...args], { cwd, env: { ...process.env, CI: 'true' } })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`コマンド失敗 (exit ${code}): ${command} ${args.join(' ')}`))
      }
    })
  })
