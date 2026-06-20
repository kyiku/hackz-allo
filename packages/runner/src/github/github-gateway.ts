import type { RepoRef } from '@github-issue-rpg/shared'
import { enableAutoMergeWithFallback, type AutoMergeResult } from './auto-merge.js'
import { aggregateCheckRuns, type CIStatus } from './ci-status.js'
import type { IssueListItem, OctokitLike } from './octokit-like.js'
import type { CreatePullRequestParams, GitHubIssue, PullRequest, RepoConnection } from './types.js'

export interface GitHubGatewayDeps {
  octokit: OctokitLike
}

/** auto-merge 有効化のパラメータ。 */
export interface EnableAutoMergeParams {
  repo: RepoRef
  prNumber: number
  /** PR の node_id（GraphQL用）。 */
  nodeId: string
  /** CI状態を確認する ref（PR head の sha/branch）。 */
  headRef: string
}

const ENABLE_AUTO_MERGE_MUTATION = `
  mutation EnableAutoMerge($prId: ID!) {
    enablePullRequestAutoMerge(input: { pullRequestId: $prId, mergeMethod: SQUASH }) {
      pullRequest { id }
    }
  }
`

export interface GitHubGateway {
  listIssues(repo: RepoRef): Promise<GitHubIssue[]>
  connectRepository(repo: RepoRef): Promise<RepoConnection>
  createPullRequest(params: CreatePullRequestParams): Promise<PullRequest>
  getCIStatus(repo: RepoRef, ref: string): Promise<CIStatus>
  enableAutoMerge(params: EnableAutoMergeParams): Promise<AutoMergeResult>
  getDiff(repo: RepoRef, prNumber: number): Promise<string>
  createIssue(repo: RepoRef, params: { title: string; body?: string; labels?: string[] }): Promise<CreatedIssue>
}

/** 作成されたissue。 */
export interface CreatedIssue {
  number: number
  url: string
}

/** 本文に対象issueの closing keyword を保証する（マージ時にissue自動close）。 */
function withClosingKeyword(body: string | undefined, issueNumber: number): string {
  const base = body ?? ''
  const keyword = `Fixes #${issueNumber}`
  if (new RegExp(`\\bFixes #${issueNumber}\\b`).test(base)) {
    return base
  }
  return base ? `${base}\n\n${keyword}` : keyword
}

function labelName(label: { name?: string } | string): string | undefined {
  return typeof label === 'string' ? label : label.name
}

function toIssue(item: IssueListItem): GitHubIssue {
  return {
    number: item.number,
    title: item.title,
    body: item.body ?? '',
    state: item.state === 'closed' ? 'closed' : 'open',
    labels: item.labels.map(labelName).filter((name): name is string => Boolean(name)),
  }
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status
    return typeof status === 'number' ? status : undefined
  }
  return undefined
}

/**
 * GitHub REST API（Octokit）への接続を抽象化する。
 * 認証情報(PAT)は呼び出し側が Octokit に注入する（Runner プロセス内のみ）。
 */
export function createGitHubGateway({ octokit }: GitHubGatewayDeps): GitHubGateway {
  async function fetchCIStatus(repo: RepoRef, ref: string): Promise<CIStatus> {
    const { data } = await octokit.rest.checks.listForRef({
      owner: repo.owner,
      repo: repo.name,
      ref,
      per_page: 100,
    })
    return aggregateCheckRuns(data.check_runs)
  }

  return {
    async listIssues(repo) {
      const { data } = await octokit.rest.issues.listForRepo({
        owner: repo.owner,
        repo: repo.name,
        state: 'open',
        per_page: 100,
      })
      // GitHub の issues API は PR も含むため除外する。
      return data.filter((item) => !item.pull_request).map(toIssue)
    },

    async connectRepository(repo) {
      let result
      try {
        result = await octokit.rest.repos.get({ owner: repo.owner, repo: repo.name })
      } catch (error) {
        const status = statusOf(error)
        if (status === 401) {
          throw new Error('GitHub認証に失敗しました。PAT(Personal Access Token)を確認してください。')
        }
        if (status === 404) {
          throw new Error(
            `リポジトリ ${repo.owner}/${repo.name} が見つからないか、PATにアクセス権がありません。`,
          )
        }
        throw new Error(
          `リポジトリ接続中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        )
      }

      const canPush = result.data.permissions?.push ?? false
      if (!canPush) {
        throw new Error(
          'PATの権限が不足しています。ブランチ作成・PR作成には Contents: write と Pull requests: write が必要です。',
        )
      }

      return {
        owner: repo.owner,
        name: repo.name,
        defaultBranch: result.data.default_branch,
        canPush,
      }
    },

    async createPullRequest(params) {
      const { data } = await octokit.rest.pulls.create({
        owner: params.repo.owner,
        repo: params.repo.name,
        title: params.title,
        head: params.head,
        base: params.base,
        body: withClosingKeyword(params.body, params.issueNumber),
      })
      return { number: data.number, url: data.html_url, nodeId: data.node_id }
    },

    async getCIStatus(repo, ref) {
      return fetchCIStatus(repo, ref)
    },

    async enableAutoMerge({ repo, prNumber, nodeId, headRef }) {
      return enableAutoMergeWithFallback({
        tryEnableAutoMerge: async () => {
          await octokit.graphql(ENABLE_AUTO_MERGE_MUTATION, { prId: nodeId })
        },
        getCIStatus: () => fetchCIStatus(repo, headRef),
        squashMerge: async () => {
          await octokit.rest.pulls.merge({
            owner: repo.owner,
            repo: repo.name,
            pull_number: prNumber,
            merge_method: 'squash',
          })
        },
      })
    },

    async getDiff(repo, prNumber) {
      const { data } = await octokit.rest.pulls.get({
        owner: repo.owner,
        repo: repo.name,
        pull_number: prNumber,
        mediaType: { format: 'diff' },
      })
      // mediaType=diff のとき data は diff 文字列。
      return typeof data === 'string' ? data : String(data)
    },

    async createIssue(repo, params) {
      const { data } = await octokit.rest.issues.create({
        owner: repo.owner,
        repo: repo.name,
        title: params.title,
        body: params.body,
        labels: params.labels,
      })
      return { number: data.number, url: data.html_url }
    },
  }
}
