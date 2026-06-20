import type { ClientEvent, IssueDraft, LoadoutTuning } from '@github-issue-rpg/shared'

/**
 * Runnerジョブのオーケストレーション（要件5.4, 5.5, 5.9, 5.1, 5.10, 5.3）。
 * クライアントイベント（cmd.forge/spell/stop/tavern/tavern.publish/loadout/npc/connect）を対応ハンドラへディスパッチする。
 * issueポーリングはRunner実体側、Backendはスケジュールとresult反映のみ。
 */

export interface JobHandlers {
  onForge(issueNumber: number): Promise<void>
  onSpell(battleId: string, message: string): Promise<void>
  onStop(battleId: string): Promise<void>
  onTavern(message: string): Promise<void>
  onTavernPublish(draft: IssueDraft): Promise<void>
  onLoadoutEquip(equipmentId: number, equipped: boolean): Promise<void>
  onLoadoutTune(tuning: LoadoutTuning): Promise<void>
  onNpcTalk(enemyId: number): Promise<void>
  onConnect(repoUrl: string): Promise<void>
  onRewardClaim(abilityIds: string[]): Promise<void>
}

export interface JobDispatcher {
  dispatch(event: ClientEvent): Promise<void>
}

/** クライアントイベントを Runner ジョブへディスパッチする。 */
export function createJobDispatcher(handlers: JobHandlers): JobDispatcher {
  return {
    async dispatch(event) {
      switch (event.type) {
        case 'cmd.forge':
          return handlers.onForge(event.issueNumber)
        case 'spell.cast':
          return handlers.onSpell(event.battleId, event.message)
        case 'cmd.stop':
          return handlers.onStop(event.battleId)
        case 'cmd.tavern':
          return handlers.onTavern(event.message)
        case 'cmd.tavern.publish':
          return handlers.onTavernPublish(event.draft)
        case 'cmd.loadout.equip':
          return handlers.onLoadoutEquip(event.equipmentId, event.equipped)
        case 'cmd.loadout.tune':
          return handlers.onLoadoutTune(event.tuning)
        case 'cmd.npc.talk':
          return handlers.onNpcTalk(event.enemyId)
        case 'cmd.connect':
          return handlers.onConnect(event.repoUrl)
        case 'cmd.reward.claim':
          return handlers.onRewardClaim(event.abilityIds)
        default: {
          const exhaustive: never = event
          throw new Error(`未知のクライアントイベント: ${JSON.stringify(exhaustive)}`)
        }
      }
    },
  }
}
