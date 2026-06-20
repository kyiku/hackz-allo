// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { Equipment, Loadout, Player } from '@github-issue-rpg/shared'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusScreen } from './StatusScreen'

afterEach(cleanup)

const player: Player = { id: 1, level: 3, exp: 250 }
const equipment: Equipment[] = [
  { id: 1, kind: 'weapon', name: '黒曜のリンタ', abilityId: 'ability.tdd-skill' },
  { id: 2, kind: 'skill', name: '無銘の書', abilityId: null },
]

function setup(overrides?: { loadout?: Loadout | null }) {
  const onEquip = vi.fn()
  const onTune = vi.fn()
  const loadout =
    overrides && 'loadout' in overrides ? overrides.loadout! : { equippedIds: [1], partySize: 2 }
  const utils = render(
    <StatusScreen
      player={player}
      loadout={loadout}
      equipment={equipment}
      assignments={[]}
      onEquip={onEquip}
      onTune={onTune}
    />,
  )
  return { onEquip, onTune, ...utils }
}

describe('StatusScreen', () => {
  it('プレイヤー状態とパーティ規模を表示する', () => {
    setup()
    expect(screen.getByText(/Lv 3・EXP 250・パーティ 2体/)).toBeInTheDocument()
  })

  it('装備中は「外す」、非装備は「装備」を表示し、トグルで onEquip を正しい引数で呼ぶ', () => {
    const { onEquip } = setup()
    // id=1 は装備中 → 「外す」
    fireEvent.click(screen.getByRole('button', { name: '外す' }))
    expect(onEquip).toHaveBeenCalledWith(1, false)
    // id=2 は非装備 → 「装備」
    fireEvent.click(screen.getByRole('button', { name: '装備' }))
    expect(onEquip).toHaveBeenCalledWith(2, true)
  })

  it('カタログ登録済み装備は実能力名を表示する', () => {
    setup()
    expect(screen.getByText(/能力: TDDの心得/)).toBeInTheDocument()
  })

  it('partySize はサーバー由来の loadout.partySize に追従する', () => {
    const { rerender } = setup({ loadout: { equippedIds: [], partySize: 1 } })
    const input = screen.getByLabelText('パーティ規模') as HTMLInputElement
    expect(input.value).toBe('1')
    // サーバーから partySize=3 が届いたら追従する。
    rerender(
      <StatusScreen
        player={player}
        loadout={{ equippedIds: [], partySize: 3 }}
        equipment={equipment}
        assignments={[]}
        onEquip={vi.fn()}
        onTune={vi.fn()}
      />,
    )
    expect((screen.getByLabelText('パーティ規模') as HTMLInputElement).value).toBe('3')
  })

  it('partySize の上限を超える入力は MAX_PARTY_SIZE に丸めて送信する', () => {
    const { onTune } = setup({ loadout: { equippedIds: [], partySize: 1 } })
    const input = screen.getByLabelText('パーティ規模')
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: '反映する' }))
    expect(onTune).toHaveBeenCalledWith({ effort: 'medium', partySize: 5 })
  })

  it('effort セレクトの値で onTune を呼ぶ', () => {
    const { onTune } = setup()
    fireEvent.change(screen.getByLabelText('努力度(effort)'), { target: { value: 'high' } })
    fireEvent.click(screen.getByRole('button', { name: '反映する' }))
    expect(onTune).toHaveBeenCalledWith(expect.objectContaining({ effort: 'high' }))
  })
})
