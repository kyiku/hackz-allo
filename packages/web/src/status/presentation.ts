import { getAbility, type Equipment, type Loadout } from '@github-issue-rpg/shared'

/** 指定装備が現在装備中か。 */
export function isEquipped(equipmentId: number, loadout: Loadout | null): boolean {
  return loadout?.equippedIds.includes(equipmentId) ?? false
}

/**
 * 装備が紐づく実能力の表示名（固定カタログ参照）。
 * 表示名はLLM生成でも実能力はカタログに限定される（design.md §8.5）。
 * 能力なし、またはカタログ未登録なら null。
 */
export function abilityLabel(equipment: Equipment): string | null {
  if (!equipment.abilityId) return null
  return getAbility(equipment.abilityId)?.displayName ?? null
}
