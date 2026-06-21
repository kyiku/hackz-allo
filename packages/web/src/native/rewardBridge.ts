import { EFFECT_CATALOG } from '@github-issue-rpg/shared'

/**
 * iOSネイティブ（WKWebView）との報酬ミニゲーム連携ブリッジ。
 * - 撃破時: `startRewardGame()` でネイティブにAR神経衰弱の起動を依頼
 * - ネイティブ側のクリア後: `window.__claimRewards(effectIds)` が呼ばれる → registerClaimHandler のハンドラへ
 * ネイティブ外（通常ブラウザ）では postMessage は no-op（false を返す）。
 */

export interface EffectCardSpec {
  effectId: string
  label: string
}

interface NativeBridgeWindow {
  webkit?: { messageHandlers?: { bridge?: { postMessage(message: unknown): void } } }
  __claimRewards?: (ids: unknown) => void
}

/** WKWebView のメッセージハンドラ（bridge）が存在するか。 */
export function hasNativeBridge(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as NativeBridgeWindow
  return Boolean(w.webkit?.messageHandlers?.bridge)
}

/** 盤面の効果カード（+1を多め、-1を少なめに重み付け）。seedで決定的に選ぶ。 */
const WEIGHTED: readonly string[] = [
  'eff.mcp.up',
  'eff.mcp.up',
  'eff.party.up',
  'eff.party.up',
  'eff.model.up',
  'eff.model.up',
  'eff.mcp.down',
  'eff.party.down',
  'eff.model.down', // -1は各1で控えめ
]

export function rewardEffectCards(seed: number, count = 6): EffectCardSpec[] {
  const out: EffectCardSpec[] = []
  for (let i = 0; i < count; i += 1) {
    const id = WEIGHTED[(Math.abs(seed) + i) % WEIGHTED.length]
    const eff = EFFECT_CATALOG.find((e) => e.id === id)
    if (eff) out.push({ effectId: eff.id, label: eff.label })
  }
  return out
}

/** ネイティブにAR報酬ミニゲームの開始を依頼する。ネイティブでなければ false。 */
export function startRewardGame(cards: EffectCardSpec[]): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as NativeBridgeWindow
  const handler = w.webkit?.messageHandlers?.bridge
  if (!handler) return false
  handler.postMessage({ type: 'reward.start', cards })
  return true
}

/** ネイティブからの報酬確定（獲得効果ID配列）を受けるハンドラを登録する。 */
export function registerClaimHandler(handler: (effectIds: string[]) => void): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as NativeBridgeWindow
  w.__claimRewards = (ids: unknown) => {
    if (Array.isArray(ids)) {
      handler(ids.filter((x): x is string => typeof x === 'string'))
    }
  }
}
