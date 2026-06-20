import type { Loadout } from '@github-issue-rpg/shared'
import { describe, expect, it, vi } from 'vitest'
import { JobNotImplementedError, createJobHandlers, type JobContext } from './handlers'
import { createJobDispatcher } from './dispatcher'
import { GithubFetchError } from '../world/index.js'

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

function makeContext(loadout?: Loadout): {
  ctx: JobContext
  loadouts: ReturnType<typeof inMemoryLoadouts>
  generate: ReturnType<typeof vi.fn>
} {
  const loadouts = inMemoryLoadouts(loadout)
  const generate = vi.fn()
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
      createFromReward: vi.fn((_playerId: number, reward: { name: string; abilityId: string | null }) => ({
        id: 100,
        kind: 'skill',
        name: reward.name,
        abilityId: reward.abilityId,
      })),
      listByPlayer: vi.fn(() => []),
    },
    generator: { generate },
    fetchIssues: vi.fn(async () => []),
    createIssue: vi.fn(async () => ({ number: 7, url: 'https://github.com/o/r/issues/7' })),
    session: { repoUrl: null },
    forgeBattle: vi.fn(async () => {}),
    playerId: 1,
  }
  return { ctx, loadouts, generate }
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

describe('createJobHandlers - tavern', () => {
  it('onTavern は会話から issue 案を生成し tavern.issueDraft を配信する', async () => {
    const { ctx, generate } = makeContext()
    const draft = { title: 'NPEを直す', body: 'null安全に', labels: ['bug'] }
    generate.mockResolvedValue(draft)

    await createJobHandlers(ctx).onTavern('ログインでたまに落ちる')

    // 生成器のプロンプトに会話が含まれる
    expect(generate.mock.calls[0][1].prompt).toContain('ログインでたまに落ちる')
    // ドラフトが配信される
    expect(ctx.backend.emit).toHaveBeenCalledWith({ type: 'tavern.issueDraft', draft })
  })

  it('onTavernPublish は issue を作成し enemy.appeared を配信する', async () => {
    const { ctx, generate } = makeContext()
    ctx.session.repoUrl = 'https://github.com/kyiku/hackz-allo-demo'
    generate.mockResolvedValue({ tests: ['t1', 't2'] })

    await createJobHandlers(ctx).onTavernPublish({
      title: 'ログイン高速化',
      body: '遅い',
      labels: ['perf'],
    })

    expect(ctx.createIssue).toHaveBeenCalledWith('kyiku', 'hackz-allo-demo', {
      title: 'ログイン高速化',
      body: '遅い',
      labels: ['perf'],
    })
    expect(ctx.backend.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'enemy.appeared',
        enemy: expect.objectContaining({ issueNumber: 7, title: 'ログイン高速化', status: 'active' }),
      }),
    )
  })

  it('onTavernPublish はリポジトリ未接続なら例外（偽の成功にしない）', async () => {
    const { ctx } = makeContext()
    await expect(
      createJobHandlers(ctx).onTavernPublish({ title: 't', body: 'b', labels: [] }),
    ).rejects.toThrow(/未接続/)
    expect(ctx.createIssue).not.toHaveBeenCalled()
  })
})

describe('createJobHandlers - reward claim', () => {
  it('onRewardClaim はカタログ能力を装備化し自動装備して player.status を配信する', async () => {
    const { ctx, loadouts } = makeContext({ equippedIds: [], partySize: 1 })
    await createJobHandlers(ctx).onRewardClaim(['ability.tdd-skill'])

    expect(ctx.equipment.createFromReward).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ abilityId: 'ability.tdd-skill', kind: 'skill' }),
      expect.any(String),
    )
    expect(loadouts.update).toHaveBeenCalledWith(1, { equippedIds: [100], partySize: 1 })
    expect(ctx.backend.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'player.status' }),
    )
  })

  it('カタログに無い能力IDは無視する（不正強化を弾く）', async () => {
    const { ctx, loadouts } = makeContext()
    await createJobHandlers(ctx).onRewardClaim(['ability.bogus'])
    expect(ctx.equipment.createFromReward).not.toHaveBeenCalled()
    expect(loadouts.update).not.toHaveBeenCalled()
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
    await expect(handlers.onNpcTalk(1)).rejects.toBeInstanceOf(JobNotImplementedError)
    await expect(handlers.onStop('b1')).rejects.toBeInstanceOf(JobNotImplementedError)
  })

  it('onForge は ctx.forgeBattle に委譲する', async () => {
    const { ctx } = makeContext()
    await createJobHandlers(ctx).onForge(42)
    expect(ctx.forgeBattle).toHaveBeenCalledWith(42)
  })

  it('onConnect 成功時は接続リポジトリを session に記憶する', async () => {
    const { ctx, generate } = makeContext()
    ctx.fetchIssues = vi.fn(async () => [{ number: 1, title: 't', body: '', labels: [] }])
    generate.mockResolvedValue({ tests: ['a'] })
    await createJobHandlers(ctx).onConnect('https://github.com/kyiku/hackz-allo-demo')
    expect(ctx.session.repoUrl).toBe('https://github.com/kyiku/hackz-allo-demo')
  })
})

describe('createJobHandlers - connect', () => {
  it('onConnect は issue を取得して world.state を配信する', async () => {
    const { ctx, generate } = makeContext()
    ctx.fetchIssues = vi.fn(async () => [
      { number: 1, title: '0除算を防ぐ', body: '...', labels: ['bug'] },
    ])
    generate.mockResolvedValue({ tests: ['t1', 't2'] })

    await createJobHandlers(ctx).onConnect('https://github.com/kyiku/hackz-allo-demo')

    expect(ctx.fetchIssues).toHaveBeenCalledWith('kyiku', 'hackz-allo-demo')
    expect(ctx.backend.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'world.state',
        world: expect.objectContaining({ repoOwner: 'kyiku', repoName: 'hackz-allo-demo' }),
        enemies: expect.arrayContaining([expect.objectContaining({ issueNumber: 1 })]),
      }),
    )
  })

  it('取得失敗は connect.error として通知する（偽の成功にしない）', async () => {
    const { ctx } = makeContext()
    ctx.fetchIssues = vi.fn(async () => {
      throw new GithubFetchError(404, 'not found')
    })

    await createJobHandlers(ctx).onConnect('https://github.com/k/r')

    expect(ctx.backend.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'connect.error', reason: 'notfound' }),
    )
  })
})
