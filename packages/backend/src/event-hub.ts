import type { ServerEvent } from '@github-issue-rpg/shared'

/**
 * WebSocketハブのコア（要件6.2）。
 * Runner由来のサーバーイベントを全クライアントへブロードキャストし、
 * 接続時に現在のワールド状態を送るためのスナップショットを保持する。
 */

export type EventListener = (event: ServerEvent) => void

export interface EventHub {
  subscribe(listener: EventListener): () => void
  broadcast(event: ServerEvent): void
  getLastWorldState(): ServerEvent | null
  size(): number
}

export function createEventHub(): EventHub {
  const listeners = new Set<EventListener>()
  let lastWorldState: ServerEvent | null = null

  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    broadcast(event) {
      if (event.type === 'world.state') {
        lastWorldState = event
      }
      for (const listener of listeners) {
        listener(event)
      }
    },
    getLastWorldState() {
      return lastWorldState
    },
    size() {
      return listeners.size
    },
  }
}
