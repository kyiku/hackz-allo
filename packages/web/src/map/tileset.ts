/**
 * Kenney RPG Pack（CC0, 64pxタイル, 20×13）のタイルアトラス定義（タスク#117 背景拡張）。
 * シートは `public/assets/tiles/rpg-pack.png` を 64px スプライトシートとして読み込み、
 * ここで定義する「フレーム番号」で各タイルを参照する。frame = row * COLS + col。
 *
 * 元シートには地面の3×3オートタイル（草/土/水）・木造の家パーツ・木・柵・樽・扉/窓などが含まれる。
 * 出典/ライセンスは scripts/sources/CREDITS.md（CC0）。
 */

/** スプライトシートの1辺タイル数（列）。frame = row * COLS + col の換算に使う。 */
export const TILESET_COLS = 20

/** 元シートのタイルサイズ(px)。Phaserの spritesheet フレーム指定に使う。 */
export const TILE_SRC = 64

/** (列,行) からフレーム番号へ。 */
export function frameAt(col: number, row: number): number {
  return row * TILESET_COLS + col
}

/** 3×3オートタイル（9フレーム）。隣接状況から辺/角/中央を選ぶ。 */
export interface AutoTile {
  tl: number
  t: number
  tr: number
  l: number
  c: number
  r: number
  bl: number
  b: number
  br: number
}

function autoTile(col0: number, row0: number): AutoTile {
  return {
    tl: frameAt(col0, row0),
    t: frameAt(col0 + 1, row0),
    tr: frameAt(col0 + 2, row0),
    l: frameAt(col0, row0 + 1),
    c: frameAt(col0 + 1, row0 + 1),
    r: frameAt(col0 + 2, row0 + 1),
    bl: frameAt(col0, row0 + 2),
    b: frameAt(col0 + 1, row0 + 2),
    br: frameAt(col0 + 2, row0 + 2),
  }
}

/** 草地（純）— 全マスのベースに敷く。 */
export const GRASS = frameAt(1, 1)

/** 草地のバリエーション（無地）と装飾（小石/草の芽）。散らして単調さを消す。 */
export const GRASS_PLAIN = frameAt(3, 1)
export const GRASS_DETAILS = [frameAt(4, 1), frameAt(4, 2)] as const

/** 土の道（草地に対するオートタイル）。cols5-7 / rows0-2。 */
export const PATH = autoTile(5, 0)

/** 水（草地に対するオートタイル）。cols10-12 / rows0-2。 */
export const WATER = autoTile(10, 0)

/** 橋（水の上に敷く木の板）。 */
export const BRIDGE = frameAt(6, 9)

/** 木（上=樹冠 / 下=幹）。種類ごとに列が異なる。樹冠は1マス上に重ねて高さを出す。 */
export const TREES = {
  green: { canopy: frameAt(0, 10), trunk: frameAt(0, 11) },
  greenSmall: { canopy: frameAt(1, 10), trunk: frameAt(1, 11) },
  autumn: { canopy: frameAt(2, 10), trunk: frameAt(2, 11) },
  pine: { canopy: frameAt(4, 10), trunk: frameAt(4, 11) },
} as const

/** 茂み（1マス）。 */
export const BUSHES = {
  green: frameAt(0, 9),
  autumn: frameAt(2, 9),
  pine: frameAt(4, 9),
} as const

/** 装飾小物（1マス）。 */
export const PROPS = {
  fence: frameAt(6, 11),
  barrel: frameAt(8, 10),
  barrelMetal: frameAt(9, 10),
  crate: frameAt(8, 9),
  sack: frameAt(8, 12),
  well: frameAt(9, 12),
  sign: frameAt(7, 8),
} as const

/** 家パーツ（木造=茶色屋根＋タン壁／石造=灰色屋根＋灰壁、＋木の扉/窓）。 */
export const HOUSE = {
  roof: frameAt(0, 6),
  roofEave: frameAt(0, 7),
  wall: frameAt(0, 5),
  roofGray: frameAt(10, 6),
  wallGray: frameAt(10, 5),
  door: frameAt(10, 11),
  window: frameAt(16, 8),
} as const

/**
 * オートタイルのフレームを、同種マスが各方向に続くかで選ぶ。
 * 角は凸コーナーのみ対応（簡易3×3）。矩形〜緩い曲線の道/川には十分。
 */
export function pickAutoTile(
  set: AutoTile,
  up: boolean,
  down: boolean,
  left: boolean,
  right: boolean,
): number {
  // up/down/left/right = その方向に「同種マスが続くか」。続かない側が縁。
  if (!up && !left) return set.tl
  if (!up && !right) return set.tr
  if (!down && !left) return set.bl
  if (!down && !right) return set.br
  if (!up) return set.t
  if (!down) return set.b
  if (!left) return set.l
  if (!right) return set.r
  return set.c
}
