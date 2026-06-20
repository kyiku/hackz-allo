import type { Difficulty } from '@github-issue-rpg/shared'
import { describe, expect, it } from 'vitest'
import { ALL_ASSETS, ASSET_MANIFEST, assetUrl, enemyAssetKey } from './manifest'

describe('enemyAssetKey', () => {
  it('難易度に対応するキーを返す', () => {
    const cases: Difficulty[] = ['easy', 'normal', 'hard', 'boss']
    for (const difficulty of cases) {
      const key = enemyAssetKey(difficulty)
      expect(key).toBe(`enemy-${difficulty}`)
      // 返したキーは必ずマニフェストに存在する。
      expect(ASSET_MANIFEST[key]).toBeDefined()
    }
  })
})

describe('assetUrl', () => {
  it('既定ベースでURLを解決する', () => {
    expect(assetUrl('player')).toBe('/assets/sprites/player.svg')
  })

  it('ベースパスを正規化して結合する（末尾スラッシュ有無を吸収）', () => {
    expect(assetUrl('town-bg', '/game')).toBe('/game/assets/bg/town.svg')
    expect(assetUrl('town-bg', '/game/')).toBe('/game/assets/bg/town.svg')
  })

  it('型外のキー（JS経由）はサイレントに undefined を返さず例外を投げる', () => {
    expect(() => assetUrl('bogus-key' as never)).toThrow(/未知のアセットキー/)
  })
})

describe('ASSET_MANIFEST', () => {
  it('各エントリの key がレコードのキーと一致する', () => {
    for (const [key, entry] of Object.entries(ASSET_MANIFEST)) {
      expect(entry.key).toBe(key)
    }
  })

  it('ALL_ASSETS は全エントリを含む', () => {
    expect(ALL_ASSETS).toHaveLength(Object.keys(ASSET_MANIFEST).length)
  })
})
