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
