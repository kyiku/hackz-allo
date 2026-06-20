import type { Reward, ServerEvent } from '@github-issue-rpg/shared'
import type { AutoMergeResult } from '../github/auto-merge.js'
import type { CreatePullRequestParams, PullRequest } from '../github/types.js'
import type { EnableAutoMergeParams } from '../github/github-gateway.js'

/**
 * 撃破確定とauto-merge連携（要件5.7, 5.2）。
 * 全pass→PR作成(closing keyword)→必須CI成功でauto-merge→issue自動close。
 */

export interface DefeatDeps {
  createPullRequest(params: CreatePullRequestParams): Promise<PullRequest>
  enableAutoMerge(params: EnableAutoMergeParams): Promise<AutoMergeResult>
}

export interface ConfirmDefeatParams {
  repo: CreatePullRequestParams['repo']
  issueNumber: number
  branch: string
  base: string
  prTitle: string
  prBody?: string
  headRef: string
}

export interface DefeatResult {
  pr: PullRequest
  autoMerge: AutoMergeResult
}

/**
 * PRを作成（`Fixes #n` でマージ時にissue自動close）し、CI成功ゲート付きで auto-merge を行う。
 */
export async function confirmDefeatAndMerge(
  deps: DefeatDeps,
  { repo, issueNumber, branch, base, prTitle, prBody, headRef }: ConfirmDefeatParams,
): Promise<DefeatResult> {
  const pr = await deps.createPullRequest({
    repo,
    title: prTitle,
    head: branch,
    base,
    issueNumber,
    body: prBody,
  })
  const autoMerge = await deps.enableAutoMerge({
    repo,
    prNumber: pr.number,
    nodeId: pr.nodeId,
    headRef,
  })
  return { pr, autoMerge }
}

/** 撃破イベント（報酬付き）を生成する。 */
export function buildDefeatedEvent(battleId: string, enemyId: number, reward: Reward): ServerEvent {
  return { type: 'battle.defeated', battleId, enemyId, reward }
}
