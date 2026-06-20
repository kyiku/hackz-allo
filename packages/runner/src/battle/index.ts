export { createTestWatcher, type TestWatcher, type RecordResult } from './test-watcher.js'
export {
  battleTransition,
  isTerminal,
  deriveStatusFromHp,
  type BattleEvent,
} from './battle-state-machine.js'
export { createHpTracker, type HpTracker, type RecordTestResult } from './hp-tracker.js'
export { finalizeRedTargets, type TestRunResult, type RedTargets } from './target-tests.js'
export {
  buildForgePrompt,
  startForgeBattle,
  type ForgeBattleIssue,
  type StartForgeBattleDeps,
  type ForgeBattleHandle,
} from './forge-battle.js'
export {
  buildBattleFailure,
  prepareRetry,
  recomputeTargetsForRetry,
  type PreservedBattleState,
  type RetryContext,
} from './failure-retry.js'
export { runForgeBattle, type ForgeRunnerDeps, type ForgeRunnerParams } from './forge-runner.js'
export { createNodeForgeBattle, type NodeForgeBattleDeps } from './forge-runner-node.js'
