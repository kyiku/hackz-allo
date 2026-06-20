import type { ClientEvent, ServerEvent } from '@github-issue-rpg/shared'
import { create } from 'zustand'
import { applyServerEvent, initialGameData, type GameData } from './reducer.js'

/** WS接続状態。UIの接続インジケータに使う。 */
export type ConnectionStatus = 'connecting' | 'open' | 'closed'

interface GameStore extends GameData {
  connection: ConnectionStatus
  /** サーバーイベントを取り込み状態へ反映する。 */
  ingest: (event: ServerEvent) => void
  setConnection: (status: ConnectionStatus) => void
  /** クライアントイベントを送信する。WS接続時に App が実体を注入する（既定はno-op）。 */
  send: (event: ClientEvent) => void
  /** 送信関数を差し替える（接続/切断時に App が呼ぶ）。 */
  setSender: (send: (event: ClientEvent) => void) => void
  /** 戦闘画面を表示から取り除く（クライアント側のみ。サーバー状態には影響しない）。 */
  dismissBattle: (battleId: string) => void
}

const noopSender: (event: ClientEvent) => void = () => {
  // WS未接続時のフォールバック（接続後に setSender で差し替わる）。
  // eslint-disable-next-line no-console
  console.warn('[store] WS未接続のため送信を破棄しました')
}

/**
 * ゲーム状態のグローバルストア。
 * WSクライアント(`ws/client.ts`)が `ingest`/`setConnection` を駆動し、
 * 各画面コンポーネントはセレクタで必要な部分だけ購読する。
 * 送信は `send`（App が WS の send を注入）で各UIから利用する。
 */
export const useGameStore = create<GameStore>((set) => ({
  ...initialGameData,
  connection: 'closed',
  ingest: (event) => set((state) => applyServerEvent(state, event)),
  setConnection: (connection) => set({ connection }),
  send: noopSender,
  setSender: (send) => set({ send }),
  dismissBattle: (battleId) =>
    set((state) => {
      // 該当battleを除いた新しい辞書を作る（不変・他は保持）。
      const battles = Object.fromEntries(
        Object.entries(state.battles).filter(([id]) => id !== battleId),
      )
      return { battles }
    }),
}))
