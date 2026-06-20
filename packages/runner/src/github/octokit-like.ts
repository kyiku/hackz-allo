/**
 * Octokit (@octokit/rest) のうち本プロジェクトが利用するメソッドだけを型として抽出する。
 * 依存注入とテスト容易性のため、`@octokit/rest` の `Octokit` インスタンスをこの形で受け取る。
 */
export interface RepoGetResult {
  data: {
    default_branch: string
    permissions?: {
      admin: boolean
      push: boolean
      pull: boolean
    }
  }
}

export interface IssueListItem {
  number: number
  title: string
  body?: string | null
  state: string
  labels: Array<{ name?: string } | string>
  /** GitHub の issues API は PR も返すため、PR判別に使う。 */
  pull_request?: unknown
}

export interface OctokitLike {
  rest: {
    repos: {
      get(params: { owner: string; repo: string }): Promise<RepoGetResult>
    }
    issues: {
      listForRepo(params: {
        owner: string
        repo: string
        state?: 'open' | 'closed' | 'all'
        per_page?: number
      }): Promise<{ data: IssueListItem[] }>
    }
  }
}
