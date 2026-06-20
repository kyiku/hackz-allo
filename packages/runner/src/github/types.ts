import type { RepoRef } from '@github-issue-rpg/shared'

/** GitHub issue（クエスト/敵の元）。 */
export interface GitHubIssue {
  number: number
  title: string
  body: string
  state: 'open' | 'closed'
  labels: string[]
}

/** リポジトリ接続結果。 */
export interface RepoConnection {
  owner: string
  name: string
  defaultBranch: string
  canPush: boolean
}

/** 作成されたPull Request。nodeId は auto-merge(GraphQL)で使う。 */
export interface PullRequest {
  number: number
  url: string
  nodeId: string
}

/** PR作成パラメータ。 */
export interface CreatePullRequestParams {
  repo: RepoRef
  title: string
  head: string
  base: string
  /** このissue番号を closing keyword (`Fixes #n`) として本文に含める。 */
  issueNumber: number
  body?: string
}
