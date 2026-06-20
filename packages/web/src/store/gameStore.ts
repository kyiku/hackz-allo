import type { ServerEvent } from '@github-issue-rpg/shared'
import { create } from 'zustand'
import { applyServerEvent, initialGameData, type GameData } from './reducer.js'

/** WS接続状態。UIの接続インジケータに使う。 */
export type ConnectionStatus = 'connecting' | 'open' | 'closed'

interface GameStore extends GameData {
  connection: ConnectionStatus
  /** サーバーイベントを取り込み状態へ反映する。 */
  ingest: (event: ServerEvent) => void
  setConnection: (status: ConnectionStatus) => void
}

/**
 * ゲーム状態のグローバルストア。
 * WSクライアント(`ws/client.ts`)が `ingest`/`setConnection` を駆動し、
 * 各画面コンポーネントはセレクタで必要な部分だけ購読する。
 */
export const useGameStore = create<GameStore>((set) => ({
  ...initialGameData,
  connection: 'closed',
  ingest: (event) => set((state) => applyServerEvent(state, event)),
  setConnection: (connection) => set({ connection }),
}))
