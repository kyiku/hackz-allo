import type { Difficulty } from '@github-issue-rpg/shared'

/**
 * ゲームアセット（街/キャラ/敵/鍛冶屋/酒場）のマニフェスト（タスク10.6）。
 * これは「組み込みの契約」であり、Phaserシーンや各UIは論理キーでアセットを参照する。
 * 現状の実体は `public/assets/**` のプレースホルダSVG。本番はAI生成PNGへ差し替える
 * （ファイルを置き換えるだけで manifest 経由の参照側は変更不要）。
 *
 * 注: プレースホルダSVG内の絵文字はOS/レンダラ依存で見え方が変わる。あくまで仮素材であり、
 * Phaserテクスチャ等での厳密な見た目を要する用途には使わない（本番PNG差し替え前提）。
 */

export type AssetKey =
  | 'town-bg'
  | 'player'
  | 'blacksmith'
  | 'tavern'
  | 'enemy-easy'
  | 'enemy-normal'
  | 'enemy-hard'
  | 'enemy-boss'

export interface AssetEntry {
  key: AssetKey
  /** publicDir基準の相対パス（先頭スラッシュなし）。 */
  file: string
  /** UI表示・ギャラリー用の表示名。 */
  label: string
  /** 本番差し替え予定か（プレースホルダなら true）。 */
  placeholder: boolean
}

export const ASSET_MANIFEST: Record<AssetKey, AssetEntry> = {
  'town-bg': { key: 'town-bg', file: 'assets/bg/town.svg', label: '街（背景）', placeholder: true },
  player: { key: 'player', file: 'assets/sprites/player.svg', label: '勇者', placeholder: true },
  blacksmith: {
    key: 'blacksmith',
    file: 'assets/sprites/blacksmith.svg',
    label: '鍛冶屋',
    placeholder: true,
  },
  tavern: { key: 'tavern', file: 'assets/sprites/tavern.svg', label: '酒場', placeholder: true },
  'enemy-easy': {
    key: 'enemy-easy',
    file: 'assets/sprites/enemy-easy.svg',
    label: '敵（easy）',
    placeholder: true,
  },
  'enemy-normal': {
    key: 'enemy-normal',
    file: 'assets/sprites/enemy-normal.svg',
    label: '敵（normal）',
    placeholder: true,
  },
  'enemy-hard': {
    key: 'enemy-hard',
    file: 'assets/sprites/enemy-hard.svg',
    label: '敵（hard）',
    placeholder: true,
  },
  'enemy-boss': {
    key: 'enemy-boss',
    file: 'assets/sprites/enemy-boss.svg',
    label: '敵（boss）',
    placeholder: true,
  },
}

/** 全アセットエントリ（ローダ/ギャラリーの反復用）。 */
export const ALL_ASSETS: readonly AssetEntry[] = Object.values(ASSET_MANIFEST)

/**
 * 敵の難易度→アセットキーの明示マップ。
 * `Difficulty` を拡張した際は Record の網羅チェックでコンパイルが止まるため、
 * テンプレートリテラル推論（実質 string）のような取りこぼしを型で防ぐ。
 */
const ENEMY_ASSET_KEYS: Record<Difficulty, AssetKey> = {
  easy: 'enemy-easy',
  normal: 'enemy-normal',
  hard: 'enemy-hard',
  boss: 'enemy-boss',
}

/** 敵の難易度に対応するアセットキーを返す。 */
export function enemyAssetKey(difficulty: Difficulty): AssetKey {
  return ENEMY_ASSET_KEYS[difficulty]
}

/**
 * アセットキーから配信URLを解決する。
 * `base` はデプロイのベースパス（Vite の `import.meta.env.BASE_URL` 相当、既定 '/'）。
 * 型外のキー（JS経由など）が来た場合は明示的に例外を投げ、サイレントな undefined 参照を防ぐ。
 */
export function assetUrl(key: AssetKey, base = '/'): string {
  const entry = ASSET_MANIFEST[key]
  if (!entry) {
    throw new Error(`未知のアセットキー: ${key}`)
  }
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return `${normalizedBase}${entry.file}`
}
