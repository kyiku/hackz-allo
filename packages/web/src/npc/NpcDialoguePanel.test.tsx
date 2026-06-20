// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { Enemy, NpcDialogue } from '@github-issue-rpg/shared'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NpcDialoguePanel } from './NpcDialoguePanel'

afterEach(cleanup)

function enemy(overrides: Partial<Enemy> & Pick<Enemy, 'id' | 'issueNumber'>): Enemy {
  return {
    worldId: 1,
    title: `issue ${overrides.issueNumber}`,
    hpTotal: 3,
    hpCurrent: 3,
    difficulty: 'normal',
    weakness: null,
    status: 'active',
    ...overrides,
  }
}

const dialogue: NpcDialogue = {
  summary: 'ログインが遅い',
  difficultyNote: 'N+1クエリ',
  files: ['src/auth.ts', 'src/db.ts'],
  winCondition: '応答が200ms以内',
}

describe('NpcDialoguePanel', () => {
  it('敵がいなければ案内文を出す', () => {
    render(<NpcDialoguePanel enemies={[]} dialogues={{}} onTalk={vi.fn()} />)
    expect(screen.getByText('話しかけられる敵がいません。')).toBeInTheDocument()
  })

  it('敵未選択ではボタンが無効', () => {
    render(
      <NpcDialoguePanel
        enemies={[enemy({ id: 10, issueNumber: 42 })]}
        dialogues={{}}
        onTalk={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '選択した敵に話しかける' })).toBeDisabled()
  })

  it('敵を選択して話しかけると正しい enemyId で onTalk が発火する', () => {
    const onTalk = vi.fn()
    render(
      <NpcDialoguePanel
        enemies={[enemy({ id: 10, issueNumber: 42 })]}
        dialogues={{}}
        onTalk={onTalk}
      />,
    )
    fireEvent.change(screen.getByLabelText('話しかける敵'), { target: { value: '10' } })
    fireEvent.click(screen.getByRole('button', { name: '選択した敵に話しかける' }))
    expect(onTalk).toHaveBeenCalledWith(10)
  })

  it('会話取得済みなら要点/難所/ファイル/勝利条件を表示する', () => {
    render(
      <NpcDialoguePanel
        enemies={[enemy({ id: 10, issueNumber: 42 })]}
        dialogues={{ 10: dialogue }}
        onTalk={vi.fn()}
      />,
    )
    fireEvent.change(screen.getByLabelText('話しかける敵'), { target: { value: '10' } })
    expect(screen.getByText('ログインが遅い')).toBeInTheDocument()
    expect(screen.getByText('N+1クエリ')).toBeInTheDocument()
    expect(screen.getByText('src/auth.ts')).toBeInTheDocument()
    expect(screen.getByText('応答が200ms以内')).toBeInTheDocument()
  })
})
