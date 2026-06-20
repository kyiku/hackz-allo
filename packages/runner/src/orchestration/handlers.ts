import type { LoadoutTuning } from '@github-issue-rpg/shared'
import type { EquipmentRepository } from '../db/repositories/equipment-repository.js'
import type { LoadoutRepository } from '../db/repositories/loadout-repository.js'
import type { PlayerRepository } from '../db/repositories/player-repository.js'
import { buildPlayerStatusEvent } from '../loadout/projection.js'
import type { BackendClient } from './backend-client.js'
import type { JobHandlers } from './dispatcher.js'

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
  /** 単一プレイヤー前提のデモにおける対象プレイヤーID。 */
  playerId: number
}

/**
 * Runner のジョブハンドラ集合を組み立てる。
 *
 * Backend↔Runner の輸送（job-server / dispatcher）はこの集合に依存して動く。
 * 実体に結線済み: 編成（装備付け替え / チューニング）。
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
    onForge: notWired('cmd.forge'),
    onSpell: notWired('spell.cast'),
    onStop: notWired('cmd.stop'),
    onTavern: notWired('cmd.tavern'),
    onTavernPublish: notWired('cmd.tavern.publish'),

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
    onConnect: notWired('cmd.connect'),
  }
}
