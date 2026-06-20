import { Octokit } from '@octokit/rest'
import type { OctokitLike } from './octokit-like.js'

/** PAT から Octokit インスタンスを生成する。PATはRunnerプロセス内のみで保持する。 */
export function createOctokit(pat: string): OctokitLike {
  return new Octokit({ auth: pat }) as unknown as OctokitLike
}
