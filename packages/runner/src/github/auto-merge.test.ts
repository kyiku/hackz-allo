import { describe, expect, it, vi } from 'vitest'
import { enableAutoMergeWithFallback } from './auto-merge'

describe('enableAutoMergeWithFallback', () => {
  it('auto-merge有効化に成功したらフォールバックしない', async () => {
    const squashMerge = vi.fn(async () => {})
    const result = await enableAutoMergeWithFallback({
      tryEnableAutoMerge: async () => {},
      getCIStatus: async () => ({ state: 'success', total: 1 }),
      squashMerge,
    })
    expect(result).toEqual({ merged: false, method: 'auto' })
    expect(squashMerge).not.toHaveBeenCalled()
  })

  it('有効化失敗→CI成功なら通常SQUASHマージにフォールバック', async () => {
    const squashMerge = vi.fn(async () => {})
    const result = await enableAutoMergeWithFallback({
      tryEnableAutoMerge: async () => {
        throw Object.assign(new Error('422'), { status: 422 })
      },
      getCIStatus: async () => ({ state: 'success', total: 2 }),
      squashMerge,
    })
    expect(result).toEqual({ merged: true, method: 'squash-fallback' })
    expect(squashMerge).toHaveBeenCalledOnce()
  })

  it('有効化失敗→CIが成功でなければマージせず例外', async () => {
    const squashMerge = vi.fn(async () => {})
    await expect(
      enableAutoMergeWithFallback({
        tryEnableAutoMerge: async () => {
          throw new Error('fail')
        },
        getCIStatus: async () => ({ state: 'failure', total: 1 }),
        squashMerge,
      }),
    ).rejects.toThrow(/マージしません/)
    expect(squashMerge).not.toHaveBeenCalled()
  })

  it('checks無しは成功扱いにせずマージしない', async () => {
    const squashMerge = vi.fn(async () => {})
    await expect(
      enableAutoMergeWithFallback({
        tryEnableAutoMerge: async () => {
          throw new Error('fail')
        },
        getCIStatus: async () => ({ state: 'no_checks', total: 0 }),
        squashMerge,
      }),
    ).rejects.toThrow()
    expect(squashMerge).not.toHaveBeenCalled()
  })
})
