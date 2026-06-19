import { describe, expect, it } from 'vitest'
import { createDatabase } from '../database'
import { createPlayerRepository } from './player-repository'

function setup() {
  return createPlayerRepository(createDatabase(':memory:'))
}

describe('PlayerRepository', () => {
  it('初期プレイヤーを作成する（Lv1/EXP0）', () => {
    const repo = setup()
    const player = repo.create()
    expect(player.level).toBe(1)
    expect(player.exp).toBe(0)
  })

  it('EXPを加算しても元オブジェクトを変更しない（イミュータブル）', () => {
    const repo = setup()
    const player = repo.create()
    const updated = repo.addExp(player.id, 100)
    expect(updated.exp).toBe(100)
    expect(player.exp).toBe(0)
  })

  it('レベルを更新できる', () => {
    const repo = setup()
    const player = repo.create()
    expect(repo.setLevel(player.id, 5).level).toBe(5)
  })

  it('存在しないidの更新はエラーを投げる', () => {
    const repo = setup()
    expect(() => repo.addExp(999, 10)).toThrow()
  })
})
