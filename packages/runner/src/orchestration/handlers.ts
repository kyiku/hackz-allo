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

/**
 * Runner のジョブハンドラ集合を組み立てる。
 *
 * Backend↔Runner の輸送（job-server / dispatcher）はこの集合に依存して動く。
 * 各アクションの実体（GitHub連携・ForgeAgent・テスト監視・DB更新）は順次ここへ結線していく。
 * 未結線のハンドラは {@link JobNotImplementedError} を投げ、偽の成功を返さない。
 */
export function createJobHandlers(): JobHandlers {
  const notWired = (type: string) => async (): Promise<never> => {
    throw new JobNotImplementedError(type)
  }
  return {
    onForge: notWired('cmd.forge'),
    onSpell: notWired('spell.cast'),
    onStop: notWired('cmd.stop'),
    onTavern: notWired('cmd.tavern'),
    onTavernPublish: notWired('cmd.tavern.publish'),
    onLoadoutEquip: notWired('cmd.loadout.equip'),
    onLoadoutTune: notWired('cmd.loadout.tune'),
    onNpcTalk: notWired('cmd.npc.talk'),
    onConnect: notWired('cmd.connect'),
  }
}
