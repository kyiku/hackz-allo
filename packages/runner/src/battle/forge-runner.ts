import type { ServerEvent } from '@github-issue-rpg/shared'
import { messageToBattleLogs } from '../ai/forge-events.js'
import { buildForgePrompt, type ForgeBattleIssue } from './forge-battle.js'

/**
 * 鍛冶屋依頼（cmd.forge）の戦闘オーケストレーション（死守コア、要件5.4/5.7）。
 *
 * issue取得 → 必要テスト生成 → 作業ツリー準備 → ForgeAgent(Claude)起動 →
 * テスト実行 → （成功なら）HP反映＋commit/push＋PR作成 → battle.defeated、
 * を順に行い、各段を battle.* イベントで配信する。
 * 副作用（clone/エージェント/テスト/PR）はすべて注入し、本体は純粋に検証可能にする。
 * 失敗は偽の成功にせず battle.failed として通知する。
 */

export interface ForgeRunnerDeps {
  emit(event: ServerEvent): Promise<void>
  /** issue番号から詳細を取得（無ければ null）。 */
  getIssue(issueNumber: number): Promise<ForgeBattleIssue | null>
  /** 必要テスト一覧を生成（LLM）。 */
  generateTests(issue: ForgeBattleIssue): Promise<string[]>
  /** 作業ツリーを用意（clone＋作業ブランチ作成）。 */
  prepareWorkspace(issueNumber: number, timestamp: number): Promise<{ path: string; branch: string }>
  /** ForgeAgent(Claude Agent SDK)を起動しSDKメッセージを流す。 */
  runAgent(params: { prompt: string; worktreePath: string }): AsyncIterable<unknown>
  /** 作業ツリーでテストを実行する。 */
  runTests(worktreePath: string): Promise<{ passed: boolean; summary: string }>
  /** 変更を commit/push し PR を作成。PR URL を返す。 */
  publish(params: { worktreePath: string; branch: string; issue: ForgeBattleIssue }): Promise<string>
  /** 作業ツリーの後始末。 */
  cleanup(worktreePath: string): Promise<void>
  /** 装備中の強化の要約（戦闘ログ表示用）。なければ null。 */
  describeLoadout?(): string | null
  /** ブランチ/battleID 用のタイムスタンプ。 */
  now(): number
}

export interface ForgeRunnerParams {
  issueNumber: number
}

export async function runForgeBattle(
  deps: ForgeRunnerDeps,
  { issueNumber }: ForgeRunnerParams,
): Promise<void> {
  const timestamp = deps.now()
  const battleId = `forge-${issueNumber}-${timestamp}`

  const issue = await deps.getIssue(issueNumber)
  if (!issue) {
    // 敵が見つからない（既にクローズ済み等）。戦闘を開始扱いにしてから失敗を通知し、
    // クライアントの「準備中」表示が battle.started を待ち続けて固まらないようにする。
    await deps.emit({ type: 'battle.started', battleId, enemyId: issueNumber, hpTotal: 1 })
    await deps.emit({
      type: 'battle.failed',
      battleId,
      reason: `issue #${issueNumber} が見つかりません（既にクローズ済みかもしれません）`,
    })
    return
  }

  let workspacePath: string | null = null
  try {
    // 必要テスト生成（失敗してもHP=1で続行）
    const tests = await deps.generateTests(issue).catch(() => [] as string[])
    const hpTotal = Math.max(1, tests.length)

    // 準備（clone）より前に battle.started を出す。これでクライアントは即座に戦闘へ遷移でき、
    // 以降の clone/エージェント/テストの失敗も「開始済みの戦闘」の battle.failed として届く。
    await deps.emit({ type: 'battle.started', battleId, enemyId: issueNumber, hpTotal })

    // 装備中の強化を表示（実際の効果はエージェントのプロンプトに注入される）。
    const buff = deps.describeLoadout?.()
    if (buff) {
      await deps.emit({ type: 'battle.log', battleId, line: `🎒 装備強化: ${buff}`, kind: 'system' })
    }

    const workspace = await deps.prepareWorkspace(issueNumber, timestamp)
    workspacePath = workspace.path
    await deps.emit({
      type: 'battle.log',
      battleId,
      line: '🌿 作業環境を準備しました。AIが解析を開始します…',
      kind: 'system',
    })

    // ForgeAgent を起動し、メッセージを戦闘ログへ変換して配信
    const prompt = buildForgePrompt(issue, tests)
    for await (const message of deps.runAgent({ prompt, worktreePath: workspace.path })) {
      for (const log of messageToBattleLogs(message as never)) {
        await deps.emit({ type: 'battle.log', battleId, line: log.line, kind: log.kind })
      }
    }

    // 実テストで合否を判定（CIゲートの前段。偽の撃破を出さない）
    const result = await deps.runTests(workspace.path)
    if (!result.passed) {
      await deps.emit({
        type: 'battle.log',
        battleId,
        line: `🛡 敵の反撃！テスト失敗: ${result.summary}`,
        kind: 'system',
      })
      await deps.emit({ type: 'battle.failed', battleId, reason: 'テストが通りませんでした' })
      return
    }

    // 全テスト通過 → HP を 0 まで削る
    for (let landed = 1; landed <= hpTotal; landed += 1) {
      await deps.emit({ type: 'battle.hp_changed', battleId, hpCurrent: hpTotal - landed })
    }

    const prUrl = await deps.publish({
      worktreePath: workspace.path,
      branch: workspace.branch,
      issue,
    })
    await deps.emit({
      type: 'battle.log',
      battleId,
      line: `🏆 PRをマージしissueをクローズ: ${prUrl}`,
      kind: 'system',
    })
    await deps.emit({
      type: 'battle.defeated',
      battleId,
      enemyId: issueNumber,
      reward: {
        kind: 'skill',
        name: `#${issueNumber} 撃破の証`,
        description: issue.title,
        abilityId: null,
      },
    })
  } catch (error) {
    await deps.emit({
      type: 'battle.failed',
      battleId,
      reason: error instanceof Error ? error.message : String(error),
    })
  } finally {
    if (workspacePath) {
      await deps.cleanup(workspacePath).catch(() => {})
    }
  }
}
