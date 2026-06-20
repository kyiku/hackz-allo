import type { Loadout } from '@github-issue-rpg/shared'
import { describe, expect, it, vi } from 'vitest'
import { JobNotImplementedError, createJobHandlers, type JobContext } from './handlers'
import { createJobDispatcher } from './dispatcher'

function inMemoryLoadouts(initial: Loadout = { equippedIds: [], partySize: 1 }) {
  let current = initial
  return {
    createForPlayer: vi.fn(() => current),
    getByPlayer: vi.fn(() => current),
    update: vi.fn((_playerId: number, patch: { equippedIds: number[]; partySize: number }) => {
      current = { equippedIds: patch.equippedIds, partySize: patch.partySize }
      return current
    }),
  }
}

function makeContext(loadout?: Loadout): { ctx: JobContext; loadouts: ReturnType<typeof inMemoryLoadouts> } {
  const loadouts = inMemoryLoadouts(loadout)
  const ctx: JobContext = {
    backend: { emit: vi.fn(async () => {}) },
    players: {
      create: vi.fn(),
      findById: vi.fn(() => ({ id: 1, level: 1, exp: 0 })),
      addExp: vi.fn(),
      setLevel: vi.fn(),
    },
    loadouts,
    equipment: {
      createFromReward: vi.fn(),
      listByPlayer: vi.fn(() => []),
    },
    playerId: 1,
  }
  return { ctx, loadouts }
}

describe('createJobHandlers - loadout', () => {
  it('onLoadoutEquip(true) は装備IDを追加し player.status を配信する', async () => {
    const { ctx, loadouts } = makeContext({ equippedIds: [], partySize: 1 })
    const handlers = createJobHandlers(ctx)
    await handlers.onLoadoutEquip(3, true)

    expect(loadouts.update).toHaveBeenCalledWith(1, { equippedIds: [3], partySize: 1 })
    expect(ctx.backend.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'player.status',
        loadout: { equippedIds: [3], partySize: 1 },
      }),
    )
  })

  it('onLoadoutEquip(false) は装備IDを外す（重複なく）', async () => {
    const { ctx, loadouts } = makeContext({ equippedIds: [3, 5], partySize: 2 })
    await createJobHandlers(ctx).onLoadoutEquip(3, false)
    expect(loadouts.update).toHaveBeenCalledWith(1, { equippedIds: [5], partySize: 2 })
  })

  it('onLoadoutEquip(true) は既に装備済みでも重複させない', async () => {
    const { ctx, loadouts } = makeContext({ equippedIds: [3], partySize: 1 })
    await createJobHandlers(ctx).onLoadoutEquip(3, true)
    expect(loadouts.update).toHaveBeenCalledWith(1, { equippedIds: [3], partySize: 1 })
  })

  it('onLoadoutTune は partySize を更新し equippedIds は保持する', async () => {
    const { ctx, loadouts } = makeContext({ equippedIds: [7], partySize: 1 })
    await createJobHandlers(ctx).onLoadoutTune({ partySize: 4 })
    expect(loadouts.update).toHaveBeenCalledWith(1, { equippedIds: [7], partySize: 4 })
  })

  it('onLoadoutTune で partySize 未指定なら現状維持', async () => {
    const { ctx, loadouts } = makeContext({ equippedIds: [], partySize: 3 })
    await createJobHandlers(ctx).onLoadoutTune({ effort: 'high' })
    expect(loadouts.update).toHaveBeenCalledWith(1, { equippedIds: [], partySize: 3 })
  })
})

describe('createJobHandlers - 未結線', () => {
  it('dispatcher を構築できる', () => {
    const { ctx } = makeContext()
    expect(() => createJobDispatcher(createJobHandlers(ctx))).not.toThrow()
  })

  it('未結線アクションは JobNotImplementedError（種別を含む）を投げる', async () => {
    const { ctx } = makeContext()
    const handlers = createJobHandlers(ctx)
    await expect(handlers.onForge(1)).rejects.toBeInstanceOf(JobNotImplementedError)
    await expect(handlers.onConnect('https://github.com/k/r')).rejects.toThrow(/cmd\.connect/)
  })
})
