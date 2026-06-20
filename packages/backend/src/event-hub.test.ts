import { describe, expect, it, vi } from 'vitest'
import type { ServerEvent } from '@github-issue-rpg/shared'
import { createEventHub } from './event-hub'

const hpEvent: ServerEvent = { type: 'battle.hp_changed', battleId: 'b1', hpCurrent: 3 }

describe('createEventHub', () => {
  it('購読者へブロードキャストする', () => {
    const hub = createEventHub()
    const a = vi.fn()
    const b = vi.fn()
    hub.subscribe(a)
    hub.subscribe(b)
    hub.broadcast(hpEvent)
    expect(a).toHaveBeenCalledWith(hpEvent)
    expect(b).toHaveBeenCalledWith(hpEvent)
  })

  it('unsubscribe で配信が止まる', () => {
    const hub = createEventHub()
    const a = vi.fn()
    const unsub = hub.subscribe(a)
    unsub()
    hub.broadcast(hpEvent)
    expect(a).not.toHaveBeenCalled()
    expect(hub.size()).toBe(0)
  })

  it('world.state を保持し、接続時スナップショットとして取得できる', () => {
    const hub = createEventHub()
    const world = { id: 1, repoOwner: 'k', repoName: 'r', repoUrl: 'https://github.com/k/r', createdAt: '2026-06-20T00:00:00.000Z' }
    const worldState: ServerEvent = { type: 'world.state', world, enemies: [] }
    hub.broadcast(worldState)
    expect(hub.getLastWorldState()).toEqual(worldState)
  })

  it('初期状態の world.state は null', () => {
    expect(createEventHub().getLastWorldState()).toBeNull()
  })
})
