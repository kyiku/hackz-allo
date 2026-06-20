/**
 * Backend WebSocket エンドポイントの解決（純関数）。
 *
 * 既定は同一オリジンの `/ws`。ただし Cloudflare Pages などにフロントだけを配信した場合、
 * 同一オリジンに `/ws` が無いため接続できない。そこで以下の優先順で上書きを許す:
 *   1. クエリ `?backend=` / `?ws=`（完全な ws(s) URL、もしくは http(s) オリジン）
 *   2. localStorage に保存した前回値
 *   3. 同一オリジン `/ws`（従来動作）
 * クエリ指定時は localStorage に保存し、次回以降クエリ無しでも繋がるようにする。
 */

const STORAGE_KEY = 'backendWsUrl'

export interface LocationLike {
  protocol: string
  host: string
  search: string
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** 上書き値（完全URL / http(s)オリジン / スキームなしホスト）を ws(s) URL へ正規化する。 */
function normalize(value: string, loc: LocationLike): string {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) return trimmed
  if (trimmed.startsWith('https://')) return `wss://${trimmed.slice('https://'.length)}/ws`
  if (trimmed.startsWith('http://')) return `ws://${trimmed.slice('http://'.length)}/ws`
  const wsProtocol = loc.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProtocol}://${trimmed}/ws`
}

/** 接続先 WebSocket URL を決定する。 */
export function resolveWsUrl(loc: LocationLike, storage?: StorageLike): string {
  const params = new URLSearchParams(loc.search)
  const override = params.get('backend') ?? params.get('ws')
  if (override) {
    const normalized = normalize(override, loc)
    storage?.setItem(STORAGE_KEY, normalized)
    return normalized
  }
  const saved = storage?.getItem(STORAGE_KEY)
  if (saved) return saved
  const wsProtocol = loc.protocol === 'https:' ? 'wss' : 'ws'
  return `${wsProtocol}://${loc.host}/ws`
}
