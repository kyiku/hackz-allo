/**
 * GitHub の open issue を取得する最小クライアント（要件5.1, 5.2）。
 * 秘密情報（PAT）は Runner プロセス内のみで使用する。Pull Request は除外する。
 */

export interface RepoRef {
  owner: string
  name: string
}

/** 取得した issue の要約（ワールド生成に必要な最小項目）。 */
export interface FetchedIssue {
  number: number
  title: string
  body: string
  labels: string[]
}

/**
 * `https://github.com/<owner>/<name>(.git)` 形式のURLを owner/name に分解する。
 * 末尾の `.git` / スラッシュは許容する。
 */
export function parseRepoUrl(repoUrl: string): RepoRef {
  const match = repoUrl
    .trim()
    .replace(/\.git$/, '')
    .replace(/\/+$/, '')
    .match(/github\.com[/:]([^/]+)\/([^/]+)$/)
  const owner = match?.[1]
  const name = match?.[2]
  if (!owner || !name) {
    throw new Error(`リポジトリURLを解釈できません: ${repoUrl}`)
  }
  return { owner, name }
}

/** fetch の差し替え用シグネチャ（テスト容易性のため注入可能）。 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

/** GitHub APIの issue レスポンス（必要項目のみ）。 */
interface GithubIssueResponse {
  number: number
  title: string
  body: string | null
  labels: Array<{ name?: string } | string>
  pull_request?: unknown
}

function toLabelNames(labels: GithubIssueResponse['labels']): string[] {
  return labels
    .map((label) => (typeof label === 'string' ? label : (label.name ?? '')))
    .filter((name) => name.length > 0)
}

/**
 * 対象リポジトリの open issue 一覧を取得する（PRは除外）。
 *
 * @throws 認証/権限/未検出を含むHTTPエラー時。呼び出し側で connect.error に変換する。
 */
export async function fetchOpenIssues(
  pat: string,
  repo: RepoRef,
  fetchImpl: FetchLike = fetch,
): Promise<FetchedIssue[]> {
  const url = `https://api.github.com/repos/${repo.owner}/${repo.name}/issues?state=open&per_page=100`
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'github-issue-rpg-runner',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!response.ok) {
    throw new GithubFetchError(response.status, `GitHub API ${response.status}`)
  }
  const data = (await response.json()) as GithubIssueResponse[]
  return data
    .filter((issue) => issue.pull_request === undefined)
    .map((issue) => ({
      number: issue.number,
      title: issue.title,
      body: issue.body ?? '',
      labels: toLabelNames(issue.labels),
    }))
}

/** HTTPステータスを保持する取得エラー（reason 分類に使う）。 */
export class GithubFetchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'GithubFetchError'
  }
}
