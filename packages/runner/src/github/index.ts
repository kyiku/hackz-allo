export { createGitHubGateway, type GitHubGateway } from './github-gateway.js'
export { createOctokit } from './octokit-factory.js'
export { createGitClient, type GitClient, type SimpleGitLike } from './git-client.js'
export { createGit } from './git-factory.js'
export type {
  GitHubIssue,
  RepoConnection,
  PullRequest,
  CreatePullRequestParams,
} from './types.js'
export type { OctokitLike } from './octokit-like.js'
