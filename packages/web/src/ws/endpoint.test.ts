import { describe, expect, it } from 'vitest'
import { resolveWsUrl, type StorageLike } from './endpoint'

function memoryStorage(initial: Record<string, string> = {}): StorageLike & { dump(): Record<string, string> } {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    dump: () => Object.fromEntries(map),
  }
}

describe('resolveWsUrl', () => {
  it('上書きが無ければ同一オリジンの /ws を返す', () => {
    expect(resolveWsUrl({ protocol: 'http:', host: 'localhost:5173', search: '' })).toBe(
      'ws://localhost:5173/ws',
    )
    expect(resolveWsUrl({ protocol: 'https:', host: 'app.example.com', search: '' })).toBe(
      'wss://app.example.com/ws',
    )
  })

  it('?backend= の完全な ws(s) URL をそのまま使う', () => {
    expect(
      resolveWsUrl({ protocol: 'https:', host: 'x.pages.dev', search: '?backend=wss://t.example/ws' }),
    ).toBe('wss://t.example/ws')
  })

  it('?backend= の http(s) オリジンを ws(s)://.../ws へ正規化する', () => {
    expect(
      resolveWsUrl({ protocol: 'https:', host: 'x.pages.dev', search: '?backend=https://t.trycloudflare.com' }),
    ).toBe('wss://t.trycloudflare.com/ws')
    expect(
      resolveWsUrl({ protocol: 'http:', host: 'x', search: '?backend=http://192.168.0.2:3001/' }),
    ).toBe('ws://192.168.0.2:3001/ws')
  })

  it('スキームなしホストはページのプロトコルに合わせる', () => {
    expect(resolveWsUrl({ protocol: 'https:', host: 'x.pages.dev', search: '?ws=t.example:3001' })).toBe(
      'wss://t.example:3001/ws',
    )
  })

  it('クエリ上書きを localStorage に保存し、次回クエリ無しでも使う', () => {
    const storage = memoryStorage()
    resolveWsUrl({ protocol: 'https:', host: 'x.pages.dev', search: '?backend=wss://t.example/ws' }, storage)
    expect(storage.dump()).toEqual({ backendWsUrl: 'wss://t.example/ws' })
    expect(resolveWsUrl({ protocol: 'https:', host: 'x.pages.dev', search: '' }, storage)).toBe(
      'wss://t.example/ws',
    )
  })
})
