export {
  buildEnemyStats,
  computeDifficulty,
  deriveWeakness,
  generateRequiredTests,
  type EnemyStats,
  type IssueSummary,
} from './enemy-stats.js'
export {
  generateNpcDialogue,
  getOrCreateNpcDialogue,
  type NpcDialogueContent,
} from './npc-dialogue.js'
export {
  seededCell,
  placeEnemies,
  type GridConfig,
  type Cell,
  type EnemyPlacement,
} from './world-map.js'
export { reconcileEnemies, type ExistingEnemy, type ReconcileResult } from './issue-reconciler.js'
export {
  fetchOpenIssues,
  parseRepoUrl,
  GithubFetchError,
  type FetchedIssue,
  type RepoRef,
  type FetchLike,
} from './github-issues.js'
export {
  generateWorldState,
  type ConnectWorldDeps,
  type WorldStateEvent,
} from './connect-world.js'
export { removedIssueNumbers } from './issue-poll.js'
