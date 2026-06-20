/* eslint-disable no-console */
/**
 * 店内（内装）背景の合成スクリプト（タスク#117拡張）。
 * Kenney Tiny Dungeon(CC0, 16px) のタイルを組み合わせ、鍛冶屋/酒場/賢者の「部屋」をPNGに焼き込む。
 * 出力は public/assets/interiors/<kind>.png。InteriorScreen が背景画像として使う（CSSで拡大表示）。
 *
 * 使い方: pnpm --filter @github-issue-rpg/web build-interiors
 * 元素材/ライセンスは scripts/sources/CREDITS.md（CC0）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(scriptDir, '../public')
const SRC = resolve(scriptDir, './sources/kenney-tinydungeon.png')

const TILE = 16
const COLS = 12 // Tiny Dungeon シートの列数

const sheet = PNG.sync.read(readFileSync(SRC))

/** タイル(列,行)をフレーム番号へ。 */
const f = (col: number, row: number) => row * COLS + col

// よく使うタイル（frame = row*COLS + col）。座標は scripts の解析メモに基づく。
const FLOOR_TAN = f(0, 4) // 砂色の床
const FLOOR_PLANK = f(0, 3) // 青灰の板床
const FLOOR_DIRT = f(0, 0) // 土の床
const WALL = f(9, 4) // 石レンガの壁
const DOOR = f(9, 3) // 木の扉
const ANVIL = f(2, 6)
const HAMMER = f(4, 5)
const BRAZIER = f(5, 2) // 炎/かがり火
const BARREL_A = f(7, 5)
const BARREL_B = f(8, 5)
const TABLE_L = f(4, 6)
const TABLE_M = f(5, 6)
const TABLE_R = f(6, 6)
const SMALL_TABLE = f(1, 6)
const CHAIR = f(0, 6)
const DRAWERS = f(3, 5) // 背の高い引き出し（本棚代わり）
const DRAWERS2 = f(3, 6)
const CABINET = f(6, 4) // 暗色の戸棚
const CHEST = f(5, 7)
const CHEST_OPEN = f(7, 7)
const BANNER_L = f(7, 0)
const BANNER_R = f(8, 0)
const BOTTLE_G = f(6, 9)
const BOTTLE_R = f(7, 9)
const BOTTLE_B = f(8, 9)

interface Item {
  frame: number
  x: number
  y: number
}

interface RoomSpec {
  key: string
  floor: number
  wall: number
  items: Item[]
}

const W = 13
const H = 8

/** frame の元シート上の左上座標。 */
function frameXY(frame: number): { sx: number; sy: number } {
  return { sx: (frame % COLS) * TILE, sy: Math.floor(frame / COLS) * TILE }
}

/** src(=sheet) の1タイルを dst へ alpha 合成（src over dst）。 */
function blit(dst: PNG, frame: number, tx: number, ty: number): void {
  const { sx, sy } = frameXY(frame)
  for (let row = 0; row < TILE; row++) {
    for (let col = 0; col < TILE; col++) {
      const si = ((sy + row) * sheet.width + (sx + col)) * 4
      const a = sheet.data[si + 3] ?? 0
      if (a === 0) continue
      const dx = tx * TILE + col
      const dy = ty * TILE + row
      const di = (dy * dst.width + dx) * 4
      const sr = sheet.data[si] ?? 0
      const sg = sheet.data[si + 1] ?? 0
      const sb = sheet.data[si + 2] ?? 0
      if (a === 255) {
        dst.data[di] = sr
        dst.data[di + 1] = sg
        dst.data[di + 2] = sb
        dst.data[di + 3] = 255
      } else {
        const af = a / 255
        const dr = dst.data[di] ?? 0
        const dg = dst.data[di + 1] ?? 0
        const db = dst.data[di + 2] ?? 0
        dst.data[di] = Math.round(sr * af + dr * (1 - af))
        dst.data[di + 1] = Math.round(sg * af + dg * (1 - af))
        dst.data[di + 2] = Math.round(sb * af + db * (1 - af))
        dst.data[di + 3] = 255
      }
    }
  }
}

function buildRoom(spec: RoomSpec): PNG {
  const out = new PNG({ width: W * TILE, height: H * TILE })
  // 下地（隙間が出ても暗色になるように）。
  for (let i = 0; i < out.data.length; i += 4) {
    out.data[i] = 26
    out.data[i + 1] = 20
    out.data[i + 2] = 16
    out.data[i + 3] = 255
  }
  // 床を全面に敷く。
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) blit(out, spec.floor, x, y)
  // 外周を壁で囲む。
  for (let x = 0; x < W; x++) {
    blit(out, spec.wall, x, 0)
    blit(out, spec.wall, x, H - 1)
  }
  for (let y = 0; y < H; y++) {
    blit(out, spec.wall, 0, y)
    blit(out, spec.wall, W - 1, y)
  }
  // 下辺中央に扉。
  blit(out, DOOR, Math.floor(W / 2), H - 1)
  // 家具。
  for (const item of spec.items) blit(out, item.frame, item.x, item.y)
  return out
}

const ROOMS: RoomSpec[] = [
  {
    // 鍛冶屋（炉のある作業場）。
    key: 'blacksmith',
    floor: FLOOR_DIRT,
    wall: WALL,
    items: [
      { frame: BANNER_L, x: 3, y: 1 },
      { frame: BANNER_R, x: 9, y: 1 },
      { frame: BRAZIER, x: 3, y: 2 },
      { frame: ANVIL, x: 6, y: 4 },
      { frame: HAMMER, x: 8, y: 3 },
      { frame: BARREL_A, x: 10, y: 5 },
      { frame: BARREL_B, x: 2, y: 5 },
      { frame: CHEST, x: 10, y: 2 },
    ],
  },
  {
    // 酒場（カウンターとテーブル）。
    key: 'tavern',
    floor: FLOOR_TAN,
    wall: WALL,
    items: [
      { frame: BOTTLE_G, x: 4, y: 1 },
      { frame: BOTTLE_R, x: 5, y: 1 },
      { frame: BOTTLE_B, x: 6, y: 1 },
      { frame: TABLE_L, x: 4, y: 2 },
      { frame: TABLE_M, x: 5, y: 2 },
      { frame: TABLE_R, x: 6, y: 2 },
      { frame: CHAIR, x: 3, y: 4 },
      { frame: SMALL_TABLE, x: 5, y: 4 },
      { frame: CHAIR, x: 7, y: 4 },
      { frame: BARREL_A, x: 10, y: 5 },
      { frame: BARREL_B, x: 9, y: 5 },
      { frame: BANNER_L, x: 2, y: 1 },
      { frame: BANNER_R, x: 10, y: 1 },
    ],
  },
  {
    // 賢者の家（書斎）。
    key: 'sage',
    floor: FLOOR_PLANK,
    wall: WALL,
    items: [
      { frame: DRAWERS, x: 2, y: 1 },
      { frame: DRAWERS2, x: 3, y: 1 },
      { frame: CABINET, x: 9, y: 1 },
      { frame: DRAWERS, x: 10, y: 1 },
      { frame: BRAZIER, x: 3, y: 4 },
      { frame: SMALL_TABLE, x: 6, y: 4 },
      { frame: BOTTLE_B, x: 6, y: 3 },
      { frame: CHEST_OPEN, x: 10, y: 5 },
    ],
  },
]

const outDir = join(publicDir, 'assets/interiors')
mkdirSync(outDir, { recursive: true })
for (const spec of ROOMS) {
  const png = buildRoom(spec)
  const outPath = join(outDir, `${spec.key}.png`)
  writeFileSync(outPath, PNG.sync.write(png))
  console.log(
    `[build-interiors] 出力: assets/interiors/${spec.key}.png (${png.width}x${png.height})`,
  )
}
console.log('[build-interiors] 完了')
