/**
 * simple-git のうち本プロジェクトが利用するメソッドだけを型として抽出する。
 * 依存注入とテスト容易性のため、`simple-git` の戻り値をこの形で受け取る。
 */
export interface SimpleGitLike {
  checkoutLocalBranch(branch: string): Promise<unknown>
  add(files: string): Promise<unknown>
  commit(message: string): Promise<unknown>
  push(remote: string, branch: string): Promise<unknown>
}

export interface GitClientDeps {
  git: SimpleGitLike
  /** push を拒否する保護ブランチ。既定は main/master。 */
  protectedBranches?: readonly string[]
}

export interface GitClient {
  createWorkBranch(issueNumber: number, timestamp: number): Promise<string>
  commitAll(message: string): Promise<void>
  push(branch: string): Promise<void>
}

const DEFAULT_PROTECTED = ['main', 'master'] as const

/**
 * simple-git をラップしたGit操作クライアント。
 * 作業ブランチ命名は `forge/issue-<n>-<ts>`。保護ブランチへの直接 push は禁止する（要件 6.1）。
 */
export function createGitClient({ git, protectedBranches = DEFAULT_PROTECTED }: GitClientDeps): GitClient {
  const protectedSet = new Set(protectedBranches)

  return {
    async createWorkBranch(issueNumber, timestamp) {
      const branch = `forge/issue-${issueNumber}-${timestamp}`
      await git.checkoutLocalBranch(branch)
      return branch
    },

    async commitAll(message) {
      await git.add('.')
      await git.commit(message)
    },

    async push(branch) {
      if (protectedSet.has(branch)) {
        throw new Error(`保護ブランチ '${branch}' への直接 push は禁止されています（作業ブランチ経由のみ）。`)
      }
      await git.push('origin', branch)
    },
  }
}
