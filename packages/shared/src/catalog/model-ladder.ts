/** モデル解放ラダー（低→高）。カードの「モデル+1/-1」がこの index を上下させる。 */
export const MODEL_LADDER = [
  'claude-sonnet-4-6',
  'claude-opus-4-6',
  'claude-opus-4-7',
  'claude-opus-4-8',
] as const

export const MODEL_TIER_MIN = 0
export const MODEL_TIER_MAX = MODEL_LADDER.length - 1

/** ティア番号を範囲内へクランプしてモデルIDを返す。 */
export function modelForTier(tier: number): string {
  const t = Math.max(MODEL_TIER_MIN, Math.min(MODEL_TIER_MAX, Math.trunc(tier)))
  return MODEL_LADDER[t]!
}
