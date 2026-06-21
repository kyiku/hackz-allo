// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { Loadout, Player } from '@github-issue-rpg/shared'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StatusScreen } from './StatusScreen'

afterEach(cleanup)

const player: Player = { id: 1, level: 3, exp: 250 }

function makeLoadout(overrides?: Partial<Loadout>): Loadout {
  return {
    partySize: 2,
    mcpSlots: 2,
    partySlots: 3,
    modelTierMax: 2,
    enabledMcpRefs: ['github'],
    selectedModelTier: 1,
    ...overrides,
  }
}

function setup(overrides?: { loadout?: Loadout | null }) {
  const onSetMcp = vi.fn()
  const onTune = vi.fn()
  const loadout =
    overrides && 'loadout' in overrides ? overrides.loadout! : makeLoadout()
  const utils = render(
    <StatusScreen
      player={player}
      loadout={loadout}
      assignments={[]}
      onSetMcp={onSetMcp}
      onTune={onTune}
    />,
  )
  return { onSetMcp, onTune, ...utils }
}

describe('StatusScreen', () => {
  it('プレイヤー状態・パーティ規模・現在モデルを表示する', () => {
    setup()
    expect(
      screen.getByText(/Lv 3・EXP 250・パーティ 2体・モデル claude-opus-4-6/),
    ).toBeInTheDocument()
  })

  it('MCP枠の見出しに enabled/mcpSlots を表示する', () => {
    setup()
    expect(screen.getByText('MCP枠 1/2')).toBeInTheDocument()
  })

  it('MCPチェックのトグルで onSetMcp を次の refs で呼ぶ', () => {
    const { onSetMcp } = setup()
    // 叡智の書物(context7) は未選択 → 追加される
    fireEvent.click(screen.getByLabelText('叡智の書物'))
    expect(onSetMcp).toHaveBeenCalledWith(['github', 'context7'])
    // github連携の籠手(github) は選択中 → 外れる
    fireEvent.click(screen.getByLabelText('github連携の籠手'))
    expect(onSetMcp).toHaveBeenCalledWith([])
  })

  it('枠が埋まると未選択MCPのチェックを無効化する', () => {
    setup({ loadout: makeLoadout({ mcpSlots: 1, enabledMcpRefs: ['github'] }) })
    const unselected = screen.getByLabelText('叡智の書物') as HTMLInputElement
    expect(unselected).toBeDisabled()
    const selected = screen.getByLabelText('github連携の籠手') as HTMLInputElement
    expect(selected).not.toBeDisabled()
  })

  it('partySize スライダーの上限は partySlots', () => {
    setup({ loadout: makeLoadout({ partySlots: 3 }) })
    const slider = screen.getByLabelText('パーティ規模') as HTMLInputElement
    expect(slider.max).toBe('3')
  })

  it('partySize はサーバー由来の loadout.partySize に追従する', () => {
    const { rerender } = setup({ loadout: makeLoadout({ partySize: 1 }) })
    expect((screen.getByLabelText('パーティ規模') as HTMLInputElement).value).toBe('1')
    rerender(
      <StatusScreen
        player={player}
        loadout={makeLoadout({ partySize: 3 })}
        assignments={[]}
        onSetMcp={vi.fn()}
        onTune={vi.fn()}
      />,
    )
    expect((screen.getByLabelText('パーティ規模') as HTMLInputElement).value).toBe('3')
  })

  it('モデルセレクトは modelTierMax まで、選択で onTune({ modelTier }) を呼ぶ', () => {
    const { onTune } = setup({ loadout: makeLoadout({ modelTierMax: 2 }) })
    const select = screen.getByLabelText('使用モデル') as HTMLSelectElement
    // tier 0,1,2 の 3 件
    expect(select.options).toHaveLength(3)
    fireEvent.change(select, { target: { value: '2' } })
    expect(onTune).toHaveBeenCalledWith({ modelTier: 2 })
  })

  it('解放見出しに modelForTier(modelTierMax) を表示する', () => {
    setup({ loadout: makeLoadout({ modelTierMax: 2 }) })
    expect(screen.getByText(/解放: claude-opus-4-7 まで/)).toBeInTheDocument()
  })

  it('effort セレクトの値で onTune を呼ぶ', () => {
    const { onTune } = setup()
    fireEvent.change(screen.getByLabelText('努力度(effort)'), { target: { value: 'high' } })
    fireEvent.click(screen.getByRole('button', { name: '反映する' }))
    expect(onTune).toHaveBeenCalledWith(expect.objectContaining({ effort: 'high' }))
  })
})
