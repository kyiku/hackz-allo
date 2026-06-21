/** 報酬カードの効果（枠の増減）。神経衰弱の盤面はこのカードで構成する。 */
export type EffectAxis = 'mcp' | 'party' | 'model'

export interface EffectCard {
  id: string
  axis: EffectAxis
  delta: number
  label: string
}

export const EFFECT_CATALOG: readonly EffectCard[] = [
  { id: 'eff.mcp.up', axis: 'mcp', delta: 1, label: 'MCP枠+1' },
  { id: 'eff.mcp.down', axis: 'mcp', delta: -1, label: 'MCP枠-1' },
  { id: 'eff.party.up', axis: 'party', delta: 1, label: 'サブエージェント+1' },
  { id: 'eff.party.down', axis: 'party', delta: -1, label: 'サブエージェント-1' },
  { id: 'eff.model.up', axis: 'model', delta: 1, label: 'モデル+1' },
  { id: 'eff.model.down', axis: 'model', delta: -1, label: 'モデル-1' },
]

const BY_ID = new Map(EFFECT_CATALOG.map((e) => [e.id, e]))

/** effect_id から効果カードを取得する。未登録は undefined。 */
export function getEffect(id: string): EffectCard | undefined {
  return BY_ID.get(id)
}
