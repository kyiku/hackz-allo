import type {
  Assignment,
  BattleLogKind,
  BattleStatus,
  Enemy,
  IssueDraft,
  Loadout,
  Player,
  Reward,
  ServerEvent,
  World,
} from '@github-issue-rpg/shared'

/** 戦闘ログ1行（演出の色分け用に kind を保持）。 */
export interface BattleLogLine {
  line: string
  kind: BattleLogKind
}

/** 1戦闘のクライアント側ビュー（HP・状態・ログ・結果を集約）。 */
export interface BattleView {
  battleId: string
  enemyId: number
  hpTotal: number
  hpCurrent: number
  status: BattleStatus
  logs: BattleLogLine[]
  reward: Reward | null
  failureReason: string | null
}

/**
 * WSイベントを投影したゲーム状態（表示の真実はBackend DB、これはその投影）。
 * enemies / battles は id 引きを高速にするため辞書で保持する。
 */
export interface GameData {
  world: World | null
  enemies: Record<number, Enemy>
  battles: Record<string, BattleView>
  player: Player | null
  loadout: Loadout | null
  assignments: Assignment[]
  /** 酒場で生成中の issue 案（未生成は null）。 */
  tavernDraft: IssueDraft | null
}

export const initialGameData: GameData = {
  world: null,
  enemies: {},
  battles: {},
  player: null,
  loadout: null,
  assignments: [],
  tavernDraft: null,
}

/**
 * サーバーイベント1件を現在状態に適用し、新しい状態を返す（イミュータブル）。
 * 対応する戦闘/敵が未知のイベントは安全に無視する（順序前後・取りこぼし耐性）。
 */
export function applyServerEvent(state: GameData, event: ServerEvent): GameData {
  switch (event.type) {
    case 'world.state':
      return {
        ...state,
        world: event.world,
        enemies: Object.fromEntries(event.enemies.map((enemy) => [enemy.id, enemy])),
      }

    case 'enemy.appeared':
      return { ...state, enemies: { ...state.enemies, [event.enemy.id]: event.enemy } }

    case 'enemy.removed': {
      const enemies = { ...state.enemies }
      delete enemies[event.enemyId]
      return { ...state, enemies }
    }

    case 'battle.started':
      return {
        ...state,
        battles: {
          ...state.battles,
          [event.battleId]: {
            battleId: event.battleId,
            enemyId: event.enemyId,
            hpTotal: event.hpTotal,
            hpCurrent: event.hpTotal,
            status: 'fighting',
            logs: [],
            reward: null,
            failureReason: null,
          },
        },
      }

    case 'battle.hp_changed': {
      const battle = state.battles[event.battleId]
      if (!battle) return state
      return {
        ...state,
        battles: { ...state.battles, [event.battleId]: { ...battle, hpCurrent: event.hpCurrent } },
      }
    }

    case 'battle.log': {
      const battle = state.battles[event.battleId]
      if (!battle) return state
      return {
        ...state,
        battles: {
          ...state.battles,
          [event.battleId]: {
            ...battle,
            logs: [...battle.logs, { line: event.line, kind: event.kind }],
          },
        },
      }
    }

    case 'battle.defeated': {
      const battle = state.battles[event.battleId]
      const battles = battle
        ? {
            ...state.battles,
            [event.battleId]: {
              ...battle,
              status: 'defeated' as BattleStatus,
              hpCurrent: 0,
              reward: event.reward,
            },
          }
        : state.battles
      const enemy = state.enemies[event.enemyId]
      const enemies = enemy
        ? { ...state.enemies, [event.enemyId]: { ...enemy, status: 'defeated' as const } }
        : state.enemies
      return { ...state, battles, enemies }
    }

    case 'battle.failed': {
      const battle = state.battles[event.battleId]
      if (!battle) return state
      return {
        ...state,
        battles: {
          ...state.battles,
          [event.battleId]: {
            ...battle,
            status: 'failed' as BattleStatus,
            failureReason: event.reason,
          },
        },
      }
    }

    case 'tavern.issueDraft':
      return { ...state, tavernDraft: event.draft }

    case 'player.status':
      return { ...state, player: event.player, loadout: event.loadout }

    case 'world.assignments':
      return { ...state, assignments: event.assignments }

    default: {
      // 全 ServerEvent を網羅していることをコンパイル時に保証する。
      const _exhaustive: never = event
      return _exhaustive
    }
  }
}
