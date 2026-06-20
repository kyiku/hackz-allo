import { describe, expect, it } from 'vitest'
import { JobNotImplementedError, createJobHandlers } from './handlers'
import { createJobDispatcher } from './dispatcher'

describe('createJobHandlers', () => {
  it('全ハンドラを備える（dispatcher が要求する形を満たす）', () => {
    const handlers = createJobHandlers()
    // dispatcher 生成が型・実体ともに通ることで網羅を担保する。
    expect(() => createJobDispatcher(handlers)).not.toThrow()
  })

  it('未結線のアクションは JobNotImplementedError を投げる（イベント種別を含む）', async () => {
    const dispatcher = createJobDispatcher(createJobHandlers())
    await expect(dispatcher.dispatch({ type: 'cmd.forge', issueNumber: 1 })).rejects.toBeInstanceOf(
      JobNotImplementedError,
    )
    await expect(
      dispatcher.dispatch({ type: 'cmd.forge', issueNumber: 1 }),
    ).rejects.toThrow(/cmd\.forge/)
  })
})
