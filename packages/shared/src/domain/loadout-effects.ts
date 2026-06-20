// loadout-effects.ts
import { getEffect } from '../catalog/effect-catalog.js'
import { MODEL_TIER_MAX } from '../catalog/model-ladder.js'
import { mcpRefs } from '../catalog/ability-catalog.js'
import { MAX_PARTY_SIZE, type Loadout } from './player.js'

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v))

/** 割り当てを現在の容量に収める（容量縮小後に呼ぶ）。イミュータブル。 */
export function clampAssignments(loadout: Loadout): Loadout {
  const pool = new Set(mcpRefs())
  const enabledMcpRefs = loadout.enabledMcpRefs
    .filter((ref) => pool.has(ref))
    .slice(0, loadout.mcpSlots)
  return {
    ...loadout,
    enabledMcpRefs,
    partySize: clamp(loadout.partySize, 1, loadout.partySlots),
    selectedModelTier: clamp(loadout.selectedModelTier, 0, loadout.modelTierMax),
  }
}

/** 表向きカードの効果を合算し、容量を更新→クランプ→割り当て切り詰めした新loadoutを返す。 */
export function applyEffects(loadout: Loadout, effectIds: readonly string[]): Loadout {
  let dMcp = 0
  let dParty = 0
  let dModel = 0
  for (const id of effectIds) {
    const eff = getEffect(id)
    if (!eff) continue
    if (eff.axis === 'mcp') dMcp += eff.delta
    else if (eff.axis === 'party') dParty += eff.delta
    else dModel += eff.delta
  }
  const mcpCap = mcpRefs().length
  const next: Loadout = {
    ...loadout,
    mcpSlots: clamp(loadout.mcpSlots + dMcp, 0, mcpCap),
    partySlots: clamp(loadout.partySlots + dParty, 1, MAX_PARTY_SIZE),
    modelTierMax: clamp(loadout.modelTierMax + dModel, 0, MODEL_TIER_MAX),
  }
  return clampAssignments(next)
}
