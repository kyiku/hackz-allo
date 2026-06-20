import type { RepoRef } from '@github-issue-rpg/shared'
import type { CreatedIssue } from '../github/github-gateway.js'
import type { IssueProposal } from './issue-proposal.js'

/**
 * 酒場: issue案のワンクリック登録（要件5.9）。
 * 確定した提案を GitHub に登録する。登録された issue は次回ポーリングで敵としてワールドに反映される。
 */

export interface IssueRegistrar {
  createIssue(repo: RepoRef, params: { title: string; body?: string; labels?: string[] }): Promise<CreatedIssue>
}

/** 提案を GitHub issue として登録する。 */
export async function registerProposal(
  gateway: IssueRegistrar,
  repo: RepoRef,
  proposal: IssueProposal,
): Promise<CreatedIssue> {
  return gateway.createIssue(repo, {
    title: proposal.title,
    body: proposal.body,
    labels: proposal.labels,
  })
}
