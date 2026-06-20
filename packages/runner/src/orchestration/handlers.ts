import type { ConnectErrorReason, Enemy, IssueDraft, LoadoutTuning } from '@github-issue-rpg/shared'
import type { StructuredGenerator } from '../ai/structured-generator.js'
import type { EquipmentRepository } from '../db/repositories/equipment-repository.js'
import type { LoadoutRepository } from '../db/repositories/loadout-repository.js'
import type { PlayerRepository } from '../db/repositories/player-repository.js'
import { buildPlayerStatusEvent } from '../loadout/projection.js'
import { generateIssueProposal } from '../tavern/issue-proposal.js'
import {
  buildEnemyStats,
  generateRequiredTests,
  generateWorldState,
  GithubFetchError,
  parseRepoUrl,
  type FetchedIssue,
} from '../world/index.js'
import type { BackendClient } from './backend-client.js'
import type { JobHandlers } from './dispatcher.js'

/** GitHub取得エラーのHTTPステータスを connect.error の reason へ分類する。 */
function classifyConnectError(error: unknown): ConnectErrorReason {
  if (error instanceof GithubFetchError) {
    if (error.status === 401) return 'auth'
    if (error.status === 403) return 'permission'
    if (error.status === 404) return 'notfound'
  }
  return 'unknown'
}

/**
 * まだ実体に結線されていないジョブが呼ばれたことを示すエラー。
 * 「受信はしたが副作用は未実装」を silent success と区別して明示する
 * （job-server はこれを 500 として返し、クライアントに error を通知する）。
 */
export class JobNotImplementedError extends Error {
  constructor(public readonly eventType: string) {
    super(`ジョブ "${eventType}" はまだ実体に結線されていません`)
    this.name = 'JobNotImplementedError'
  }
}

/** ジョブハンドラが副作用を行うための依存（テスト容易性のため注入）。 */
export interface JobContext {
  backend: BackendClient
  players: PlayerRepository
  loadouts: LoadoutRepository
  equipment: EquipmentRepository
  /** 構造化生成器（既定は Agent SDK = サブスク認証。酒場の issue 案生成等に使う）。 */
  generator: StructuredGenerator
  /** open issue を取得する（repo接続＝ワールド生成に使う。PATは内部に閉じる）。 */
  fetchIssues(owner: string, name: string): Promise<FetchedIssue[]>
  /** issue を作成する（酒場での登録に使う）。作成された番号/URLを返す。 */
  createIssue(
    owner: string,
    name: string,
    draft: { title: string; body: string; labels: string[] },
  ): Promise<{ number: number; url: string }>
  /** 現在接続中リポジトリの可変状態（onConnect が設定、onForge が参照）。 */
  session: { repoUrl: string | null }
  /** cmd.forge の実体（clone→Claude→テスト→PR）。実依存は外側で注入する。 */
  forgeBattle(issueNumber: number): Promise<void>
  /** 単一プレイヤー前提のデモにおける対象プレイヤーID。 */
  playerId: number
}

/**
 * Runner のジョブハンドラ集合を組み立てる。
 *
 * Backend↔Runner の輸送（job-server / dispatcher）はこの集合に依存して動く。
 * 実体に結線済み: 編成（装備付け替え / チューニング）、酒場の issue 案生成。
 * 未結線のハンドラは {@link JobNotImplementedError} を投げ、偽の成功を返さない
 * （GitHub連携・ForgeAgent・テスト監視は順次ここへ結線していく）。
 */
export function createJobHandlers(ctx: JobContext): JobHandlers {
  const notWired = (type: string) => async (): Promise<never> => {
    throw new JobNotImplementedError(type)
  }

  /** 現在のプレイヤー状態/編成/装備を player.status として配信する。 */
  async function emitPlayerStatus(): Promise<void> {
    const player = ctx.players.findById(ctx.playerId)
    if (!player) {
      throw new Error(`Player not found: id=${ctx.playerId}`)
    }
    const loadout = ctx.loadouts.getByPlayer(ctx.playerId)
    if (!loadout) {
      throw new Error(`Loadout not found: player=${ctx.playerId}`)
    }
    const equipment = ctx.equipment.listByPlayer(ctx.playerId)
    await ctx.backend.emit(buildPlayerStatusEvent(player, loadout, equipment))
  }

  return {
    onForge: (issueNumber: number) => ctx.forgeBattle(issueNumber),
    onSpell: notWired('spell.cast'),
    onStop: notWired('cmd.stop'),

    async onTavern(message: string): Promise<void> {
      // 会話から issue 案を生成し、ワンクリック登録用のドラフトとして配信する（要件5.9）。
      const draft = await generateIssueProposal(ctx.generator, { conversation: message })
      await ctx.backend.emit({ type: 'tavern.issueDraft', draft })
    },

    async onTavernPublish(draft: IssueDraft): Promise<void> {
      // 酒場の issue 案を実リポジトリへ登録し、新しい敵としてワールドへ出現させる（要件5.9, 5.2）。
      const repoUrl = ctx.session.repoUrl
      if (!repoUrl) {
        throw new Error('リポジトリ未接続のため issue を登録できません。先にワールドへ接続してください。')
      }
      const { owner, name } = parseRepoUrl(repoUrl)
      const created = await ctx.createIssue(owner, name, {
        title: draft.title,
        body: draft.body,
        labels: draft.labels,
      })
      // 登録した issue を即座に敵として配信（再ポーリングを待たず反映する）。
      const requiredTests = await generateRequiredTests(ctx.generator, {
        title: draft.title,
        body: draft.body,
        labels: draft.labels,
      }).catch(() => [] as string[])
      const stats = buildEnemyStats({ requiredTests, labels: draft.labels })
      const enemy: Enemy = {
        id: created.number,
        worldId: 1,
        issueNumber: created.number,
        title: draft.title,
        hpTotal: stats.hpTotal,
        hpCurrent: stats.hpTotal,
        difficulty: stats.difficulty,
        weakness: stats.weakness,
        status: 'active',
      }
      await ctx.backend.emit({ type: 'enemy.appeared', enemy })
    },

    async onLoadoutEquip(equipmentId: number, equipped: boolean): Promise<void> {
      const loadout = ctx.loadouts.getByPlayer(ctx.playerId)
      if (!loadout) {
        throw new Error(`Loadout not found: player=${ctx.playerId}`)
      }
      const equippedIds = equipped
        ? [...new Set([...loadout.equippedIds, equipmentId])]
        : loadout.equippedIds.filter((id) => id !== equipmentId)
      ctx.loadouts.update(ctx.playerId, { equippedIds, partySize: loadout.partySize })
      await emitPlayerStatus()
    },

    async onLoadoutTune(tuning: LoadoutTuning): Promise<void> {
      const loadout = ctx.loadouts.getByPlayer(ctx.playerId)
      if (!loadout) {
        throw new Error(`Loadout not found: player=${ctx.playerId}`)
      }
      // Loadout に永続化できるのは partySize のみ。effort/model/permissionMode は
      // 次戦の query() 実行時設定であり、編成テーブルには保存しない（design.md §8.9）。
      const partySize = tuning.partySize ?? loadout.partySize
      ctx.loadouts.update(ctx.playerId, { equippedIds: loadout.equippedIds, partySize })
      await emitPlayerStatus()
    },

    onNpcTalk: notWired('cmd.npc.talk'),

    async onConnect(repoUrl: string): Promise<void> {
      // repoURL → open issue 取得 → 敵生成 → world.state 配信（要件5.2）。
      // 取得失敗は偽の成功にせず connect.error として通知する（要件5.1）。
      try {
        const event = await generateWorldState(
          {
            fetchIssues: ctx.fetchIssues,
            generateTests: (issue) => generateRequiredTests(ctx.generator, issue),
            now: () => new Date().toISOString(),
          },
          repoUrl,
        )
        await ctx.backend.emit(event)
        // 接続成功したリポジトリを記憶し、以降の cmd.forge の対象にする。
        ctx.session.repoUrl = repoUrl
      } catch (error) {
        await ctx.backend.emit({
          type: 'connect.error',
          reason: classifyConnectError(error),
          message: error instanceof Error ? error.message : 'リポジトリ接続に失敗しました',
        })
      }
    },
  }
}
