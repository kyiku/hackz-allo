import type { Equipment, Loadout } from '@github-issue-rpg/shared'
import { describe, expect, it } from 'vitest'
import { abilityLabel, isEquipped } from './presentation'

const loadout: Loadout = { equippedIds: [1, 3], partySize: 2 }

describe('isEquipped', () => {
  it('装備中IDを真と判定する', () => {
    expect(isEquipped(1, loadout)).toBe(true)
    expect(isEquipped(3, loadout)).toBe(true)
  })
  it('非装備/loadout未取得は偽', () => {
    expect(isEquipped(2, loadout)).toBe(false)
    expect(isEquipped(1, null)).toBe(false)
  })
})

describe('abilityLabel', () => {
  function equip(abilityId: string | null): Equipment {
    return { id: 1, kind: 'skill', name: '表示名', abilityId }
  }

  it('カタログ登録済み能力の表示名を返す', () => {
    expect(abilityLabel(equip('ability.tdd-skill'))).toBe('TDDの心得')
  })
  it('能力なしは null', () => {
    expect(abilityLabel(equip(null))).toBeNull()
  })
  it('カタログ未登録は null', () => {
    expect(abilityLabel(equip('ability.unknown'))).toBeNull()
  })
})
