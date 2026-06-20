import { ABILITY_CATALOG } from '@github-issue-rpg/shared'

/**
 * iOSネイティブ（WKWebView）との報酬ミニゲーム連携ブリッジ。
 * - 撃破時: `startRewardGame()` でネイティブにAR神経衰弱の起動を依頼
 * - ネイティブ側のクリア後: `window.__claimRewards(ids)` が呼ばれる → registerClaimHandler のハンドラへ
 * ネイティブ外（通常ブラウザ）では postMessage は no-op（false を返す）。
 */

export interface RewardAbility {
  id: string
  name: string
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

/** 撃破した敵の番号をシードに、報酬カード候補（カタログから数件）を選ぶ。 */
export function rewardCandidates(seed: number, count = 3): RewardAbility[] {
  const list = ABILITY_CATALOG
  const out: RewardAbility[] = []
  const total = list.length
  for (let i = 0; i < Math.min(count, total); i += 1) {
    const ability = list[(Math.abs(seed) + i) % total]
    if (ability) out.push({ id: ability.id, name: ability.displayName })
  }
  return out
}

/** ネイティブにAR報酬ミニゲームの開始を依頼する。ネイティブでなければ false。 */
export function startRewardGame(abilities: RewardAbility[]): boolean {
  if (typeof window === 'undefined') return false
  const w = window as unknown as NativeBridgeWindow
  const handler = w.webkit?.messageHandlers?.bridge
  if (!handler) return false
  handler.postMessage({ type: 'reward.start', abilities })
  return true
}

/** ネイティブからの報酬確定（獲得能力ID配列）を受けるハンドラを登録する。 */
export function registerClaimHandler(handler: (abilityIds: string[]) => void): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as NativeBridgeWindow
  w.__claimRewards = (ids: unknown) => {
    if (Array.isArray(ids)) {
      handler(ids.filter((x): x is string => typeof x === 'string'))
    }
  }
}
