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

export interface PullCreateResult {
  data: {
    number: number
    html_url: string
    node_id: string
  }
}

export interface OctokitLike {
  graphql<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T>
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
    checks: {
      listForRef(params: {
        owner: string
        repo: string
        ref: string
        per_page?: number
      }): Promise<{ data: { total_count: number; check_runs: Array<{ status: string; conclusion: string | null }> } }>
    }
    pulls: {
      create(params: {
        owner: string
        repo: string
        title: string
        head: string
        base: string
        body?: string
      }): Promise<PullCreateResult>
      merge(params: {
        owner: string
        repo: string
        pull_number: number
        merge_method?: 'merge' | 'squash' | 'rebase'
      }): Promise<unknown>
    }
  }
}
