/**
 * Git worktree 操作の抽象。テスト容易性のため simple-git/raw を注入する。
 */
export interface WorkspaceGit {
  /** リモートの最新を取得する。 */
  fetch(remote: string, branch: string): Promise<void>
  /** 使い捨て worktree を baseRef から作業ブランチで追加する。 */
  addWorktree(worktreePath: string, branch: string, baseRef: string): Promise<void>
  /** worktree を撤去する。 */
  removeWorktree(worktreePath: string): Promise<void>
  /** 作業ツリーがクリーン(未コミット変更なし)か。 */
  isClean(worktreePath: string): Promise<boolean>
}

/** 依存インストール等のコマンド実行の抽象。 */
export type CommandRunner = (command: string, args: readonly string[], cwd: string) => Promise<void>

export interface RepoWorkspaceDeps {
  git: WorkspaceGit
  run: CommandRunner
  remote?: string
}

export interface PrepareParams {
  baseBranch: string
  workBranch: string
  worktreePath: string
  /** 依存インストールコマンド（例: ['install'] を pnpm で）。省略時はスキップ。 */
  install?: { command: string; args: readonly string[] }
}

export interface PreparedWorkspace {
  path: string
  branch: string
}

export interface RepoWorkspace {
  prepare(params: PrepareParams): Promise<PreparedWorkspace>
  assertClean(worktreePath: string): Promise<void>
  cleanup(worktreePath: string): Promise<void>
}

/**
 * 最新の base ブランチから使い捨て worktree を作り、依存をインストールする。
 * 後始末で worktree を撤去する（要件 5.4, 6.1）。
 */
export function createRepoWorkspace({ git, run, remote = 'origin' }: RepoWorkspaceDeps): RepoWorkspace {
  return {
    async prepare({ baseBranch, workBranch, worktreePath, install }) {
      // 最新の base を取得してから作業ブランチを切る
      await git.fetch(remote, baseBranch)
      await git.addWorktree(worktreePath, workBranch, `${remote}/${baseBranch}`)
      if (install) {
        await run(install.command, install.args, worktreePath)
      }
      return { path: worktreePath, branch: workBranch }
    },

    async assertClean(worktreePath) {
      const clean = await git.isClean(worktreePath)
      if (!clean) {
        throw new Error(`作業ツリーに未コミットの変更があります: ${worktreePath}`)
      }
    },

    async cleanup(worktreePath) {
      await git.removeWorktree(worktreePath)
    },
  }
}
