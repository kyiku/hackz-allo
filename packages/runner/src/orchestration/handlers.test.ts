import { INITIAL_LOADOUT, type Loadout } from '@github-issue-rpg/shared'
import { describe, expect, it, vi } from 'vitest'
import { JobNotImplementedError, createJobHandlers, type JobContext } from './handlers'
import { createJobDispatcher } from './dispatcher'
import { GithubFetchError } from '../world/index.js'

function inMemoryLoadouts(initial: Loadout = INITIAL_LOADOUT) {
  let current = initial
  return {
    createForPlayer: vi.fn(() => current),
    getByPlayer: vi.fn(() => current),
    update: vi.fn((_playerId: number, loadout: Loadout) => {
      current = loadout
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
    generator: { generate },
    fetchIssues: vi.fn(async () => []),
    createIssue: vi.fn(async () => ({ number: 7, url: 'https://github.com/o/r/issues/7' })),
    session: { repoUrl: null, enemyIssueNumbers: new Set<number>() },
    forgeBattle: vi.fn(async () => {}),
    playerId: 1,
  }
  return { ctx, loadouts, generate }
}

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
  it('onRewardClaim は表向き効果で loadout の枠を増やし player.status を配信する', async () => {
    const { ctx, loadouts } = makeContext()
    await createJobHandlers(ctx).onRewardClaim(['eff.mcp.up', 'eff.model.up'])

    expect(loadouts.update).toHaveBeenCalledWith(
      ctx.playerId,
      expect.objectContaining({ mcpSlots: 1, modelTierMax: 1 }),
    )
    expect(ctx.backend.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'player.status' }),
    )
  })

  it('カタログに無い効果IDは無視する（クランプで不正強化を弾く）', async () => {
    const { ctx, loadouts } = makeContext()
    await createJobHandlers(ctx).onRewardClaim(['eff.bogus'])
    expect(loadouts.update).toHaveBeenCalledWith(
      ctx.playerId,
      expect.objectContaining({ mcpSlots: 0, modelTierMax: 0 }),
    )
  })
})

describe('createJobHandlers - loadout tune/mcp', () => {
  it('onLoadoutTune は partySize/modelTier を容量内にクランプ保存する', async () => {
    const { ctx, loadouts } = makeContext({ ...INITIAL_LOADOUT, partySlots: 2, modelTierMax: 1 })
    await createJobHandlers(ctx).onLoadoutTune({ partySize: 5, modelTier: 3 })
    expect(loadouts.update).toHaveBeenCalledWith(
      ctx.playerId,
      expect.objectContaining({ partySize: 2, selectedModelTier: 1 }),
    )
  })

  it('onLoadoutMcp は枠数とプールでクランプして保存する', async () => {
    const { ctx, loadouts } = makeContext({ ...INITIAL_LOADOUT, mcpSlots: 1 })
    await createJobHandlers(ctx).onLoadoutMcp(['github', 'context7', 'bogus'])
    expect(loadouts.update).toHaveBeenCalledWith(
      ctx.playerId,
      expect.objectContaining({ enabledMcpRefs: ['github'] }),
    )
  })

  it('dispatcher は cmd.loadout.mcp を onLoadoutMcp へルーティングする', async () => {
    const { ctx, loadouts } = makeContext({ ...INITIAL_LOADOUT, mcpSlots: 1 })
    const dispatcher = createJobDispatcher(createJobHandlers(ctx))
    await dispatcher.dispatch({ type: 'cmd.loadout.mcp', refs: ['github'] })
    expect(loadouts.update).toHaveBeenCalledWith(
      ctx.playerId,
      expect.objectContaining({ enabledMcpRefs: ['github'] }),
    )
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
