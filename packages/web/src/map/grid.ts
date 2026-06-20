/**
 * マップのグリッド・村レイアウト・敵配置・移動ロジック（純関数）。
 * Phaserに依存しないため単体テスト可能。描画は MapScene が本モジュールを利用する。
 * 設計: design.md §5（固定テンプレート＋issue番号シードで決定的配置、グリッド移動、敵接触で戦闘遷移）。
 *
 * 背景は「草地ベース＋川/橋・土の道・木立・木造の家・柵/樽/井戸/看板」のレイヤー構成（タスク#117拡張）。
 * 地形(TERRAIN)/オブジェクト(MAP_OBJECTS)/家(HOUSES)を本モジュールで定義し、MapScene が Kenney RPG Pack の
 * タイル（tileset.ts）で描画する。家は複数マスで、扉セル＝ランドマーク（隣接して決定キーで会話）。
 */

import {
  BUSHES,
  HOUSE,
  PROPS,
  TREES,
  type AutoTile,
  PATH as PATH_TILE,
  WATER as WATER_TILE,
} from './tileset'

/**
 * グリッド寸法とタイルサイズ(px)。
 * カメラは等倍でフィールド全体を表示（MapView の Scale.FIT がアスペクト比を保って画面にフィット）。
 * 32×20（16:10）にして1画面に村を詰めつつ、左右の余白を抑える。
 */
export const GRID = { cols: 32, rows: 20, tile: 48 } as const

export interface Cell {
  x: number
  y: number
}

export type Direction = 'up' | 'down' | 'left' | 'right'

/** セルを集合キー("x,y")へ変換する。 */
export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`
}

// ---------------------------------------------------------------------------
// 村レイアウト
// ---------------------------------------------------------------------------

/** 地形種別。grass がベースで、それ以外を上に重ねる。bridge は water の上の歩ける橋。 */
export type Terrain = 'grass' | 'path' | 'water' | 'bridge'

/** 家（複数マス）。x,y=左上、扉は最下段中央。扉セルがランドマーク（会話）になる。 */
export interface House {
  kind: 'blacksmith' | 'tavern' | 'sage'
  x: number
  y: number
  w: number
  h: number
}

/** マップ上の装飾/障害オブジェクト（1マス）。tree は canopy を1マス上に重ねる。 */
export interface MapObject {
  x: number
  y: number
  /** 主フレーム（tree は幹、その他は本体）。 */
  frame: number
  /** tree の樹冠フレーム（1マス上に描画）。 */
  canopy?: number
  /** 通行不可か。 */
  blocking: boolean
}

/** ランドマーク種別（鍛冶屋/酒場/賢者）。 */
export type LandmarkKind = House['kind']

/**
 * 家3軒（村に点在）。扉は最下段中央。形はそれぞれ変える:
 * 鍛冶屋=横長の石造(4×3,煙突), 酒場=縦長の2階建(3×4,INN看板), 賢者=切妻屋根の家(3×3)。
 */
export const HOUSES: readonly House[] = [
  { kind: 'blacksmith', x: 3, y: 2, w: 4, h: 3 },
  { kind: 'tavern', x: 24, y: 2, w: 3, h: 4 },
  { kind: 'sage', x: 3, y: 14, w: 3, h: 3 },
]

/** 家の扉セル（最下段中央）。プレイヤーは扉の手前に立ち、決定キーで会話する。 */
function doorCell(house: House): Cell {
  return { x: house.x + Math.floor(house.w / 2), y: house.y + house.h - 1 }
}

/** 鍛冶屋・酒場・賢者の扉セル（＝ランドマーク座標）。 */
export const LANDMARKS: Record<LandmarkKind, Cell> = Object.fromEntries(
  HOUSES.map((house) => [house.kind, doorCell(house)]),
) as Record<LandmarkKind, Cell>

/** プレイヤーの初期位置（中央のメインストリート上）。 */
export const PLAYER_START: Cell = { x: 9, y: 10 }

/** 川の各行の左端x（2マス幅で蛇行）。base 15 を中心に x15〜18 を行き来する。 */
const RIVER_LEFT_X = [
  15, 15, 16, 16, 17, 17, 16, 16, 15, 15, 15, 16, 16, 17, 17, 16, 16, 15, 15, 15,
] as const

/** 橋を架ける行（メインストリートが川を渡る）。 */
const BRIDGE_ROW = 10

/** 家のフットプリント全セル（描画/衝突用）。 */
function houseCells(): Set<string> {
  const cells = new Set<string>()
  for (const house of HOUSES) {
    for (let dy = 0; dy < house.h; dy++) {
      for (let dx = 0; dx < house.w; dx++) {
        cells.add(cellKey({ x: house.x + dx, y: house.y + dy }))
      }
    }
  }
  return cells
}

const HOUSE_CELLS = houseCells()

/**
 * 地形グリッドを構築する。
 * 草地ベース → 川（蛇行2マス幅）→ メインストリート(横) と各家への連絡路(縦) → 橋。
 */
function buildTerrain(): Terrain[][] {
  const { cols, rows } = GRID
  const grid: Terrain[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 'grass' as Terrain),
  )

  // 川（蛇行2マス幅）。
  for (let y = 0; y < rows; y++) {
    const lx = RIVER_LEFT_X[y] ?? 15
    for (const x of [lx, lx + 1]) {
      if (x >= 0 && x < cols) grid[y]![x] = 'water'
    }
  }

  const setPath = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return
    // 川の上は橋、それ以外は土の道。家のセルは塗らない（家が上描き）。
    if (HOUSE_CELLS.has(cellKey({ x, y }))) return
    grid[y]![x] = grid[y]![x] === 'water' ? 'bridge' : 'path'
  }

  // メインストリート（横, y=BRIDGE_ROW）。
  for (let x = 2; x <= cols - 2; x++) setPath(x, BRIDGE_ROW)
  // 各家の扉手前からメインストリートへの連絡路。
  // 鍛冶屋(扉 5,4・南向き)・酒場(扉 25,5・南向き)は主道の北なので縦に直結。
  for (let y = 5; y < BRIDGE_ROW; y++) setPath(5, y) // 鍛冶屋→主道
  for (let y = 6; y < BRIDGE_ROW; y++) setPath(25, y) // 酒場→主道
  // 賢者(扉 4,16・南向き)は主道の南。家を東側から迂回し、扉手前(4,17)へL字で回り込む。
  for (let y = BRIDGE_ROW + 1; y <= 17; y++) setPath(6, y) // 主道→家の東を南下
  for (let x = 4; x <= 6; x++) setPath(x, 17) // 家の南を西へ→扉手前(4,17)

  return grid
}

/** 地形グリッド（[y][x]）。MapScene が参照する。 */
export const TERRAIN: readonly Terrain[][] = buildTerrain()

/** 指定セルの地形（範囲外は grass 扱い）。 */
export function terrainAt(x: number, y: number): Terrain {
  if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) return 'grass'
  return TERRAIN[y]![x]!
}

/** 木立・装飾オブジェクトを構築する。外周を木で縁取りつつ、要所に小物を置く。 */
function buildObjects(): MapObject[] {
  const objects: MapObject[] = []
  const occupied = new Set<string>()
  const treeKinds = [TREES.green, TREES.pine, TREES.greenSmall, TREES.autumn]

  const canPlace = (x: number, y: number): boolean => {
    const key = cellKey({ x, y })
    if (occupied.has(key)) return false
    if (HOUSE_CELLS.has(key)) return false
    if (terrainAt(x, y) !== 'grass') return false
    return true
  }
  const place = (obj: MapObject) => {
    objects.push(obj)
    occupied.add(cellKey({ x: obj.x, y: obj.y }))
  }

  // 外周の木立（村を縁取る）。左上隅(0,0)は歩行可能の草地として空ける。
  const { cols, rows } = GRID
  for (let x = 0; x < cols; x++) {
    for (const y of [0, rows - 1]) {
      if (x === 0 && y === 0) continue
      if (!canPlace(x, y)) continue
      const tree = treeKinds[(x + y) % treeKinds.length]!
      place({ x, y, frame: tree.trunk, canopy: tree.canopy, blocking: true })
    }
  }
  for (let y = 1; y < rows - 1; y++) {
    for (const x of [0, cols - 1]) {
      if (x === 0 && y === 0) continue
      if (!canPlace(x, y)) continue
      const tree = treeKinds[(x + y) % treeKinds.length]!
      place({ x, y, frame: tree.trunk, canopy: tree.canopy, blocking: true })
    }
  }

  // 内側の木立クラスタ（奥行き）。
  const clusters: Cell[] = [
    { x: 8, y: 2 },
    { x: 9, y: 3 },
    { x: 20, y: 2 },
    { x: 21, y: 3 },
    { x: 28, y: 8 },
    { x: 29, y: 9 },
    { x: 8, y: 17 },
    { x: 22, y: 17 },
    { x: 29, y: 14 },
  ]
  for (const c of clusters) {
    if (!canPlace(c.x, c.y)) continue
    const tree = treeKinds[(c.x + c.y) % treeKinds.length]!
    place({ x: c.x, y: c.y, frame: tree.trunk, canopy: tree.canopy, blocking: true })
  }

  // 茂み（非ブロックの装飾）。
  for (const c of [
    { x: 11, y: 8 },
    { x: 19, y: 12 },
    { x: 27, y: 12 },
  ] as Cell[]) {
    if (canPlace(c.x, c.y)) place({ x: c.x, y: c.y, frame: BUSHES.green, blocking: false })
  }

  // 小物（井戸/看板/樽/木箱/袋/柵）。生活感を出す。
  const props: MapObject[] = [
    { x: 9, y: 8, frame: PROPS.well, blocking: true },
    { x: 11, y: 11, frame: PROPS.sign, blocking: true },
    { x: 8, y: 4, frame: PROPS.crate, blocking: true },
    { x: 10, y: 8, frame: PROPS.sack, blocking: true },
    { x: 27, y: 5, frame: PROPS.barrel, blocking: true },
    { x: 27, y: 6, frame: PROPS.barrelMetal, blocking: true },
    { x: 7, y: 14, frame: PROPS.fence, blocking: true },
    { x: 7, y: 15, frame: PROPS.fence, blocking: true },
    { x: 7, y: 16, frame: PROPS.fence, blocking: true },
    { x: 20, y: 15, frame: PROPS.fence, blocking: true },
    { x: 21, y: 15, frame: PROPS.fence, blocking: true },
    { x: 22, y: 15, frame: PROPS.fence, blocking: true },
  ]
  for (const p of props) if (canPlace(p.x, p.y)) place(p)

  return objects
}

/** マップ上の木立・装飾オブジェクト。MapScene が描画し、blocking は衝突に使う。 */
export const MAP_OBJECTS: readonly MapObject[] = buildObjects()

/** 道/水のオートタイル参照（MapScene 用に再公開）。 */
export const PATH: AutoTile = PATH_TILE
export const WATER: AutoTile = WATER_TILE
/** 家パーツのフレーム（MapScene 用に再公開）。 */
export const HOUSE_TILES = HOUSE

/** 静的な移動不可セル（水・ブロックするオブジェクト・家）。 */
function buildStaticBlocked(): Set<string> {
  const blocked = new Set<string>(HOUSE_CELLS)
  for (let y = 0; y < GRID.rows; y++) {
    for (let x = 0; x < GRID.cols; x++) {
      if (TERRAIN[y]![x] === 'water') blocked.add(cellKey({ x, y }))
    }
  }
  for (const obj of MAP_OBJECTS) if (obj.blocking) blocked.add(cellKey({ x: obj.x, y: obj.y }))
  return blocked
}

const STATIC_BLOCKED = buildStaticBlocked()

/**
 * 敵を置かない予約セル（草地以外のすべて＋プレイヤー初期位置）。
 * 敵は歩ける草地にだけ湧かせ、道/水/橋/木/家には乗らないようにする。
 */
function buildReserved(): Set<string> {
  const reserved = new Set<string>([cellKey(PLAYER_START)])
  for (let y = 0; y < GRID.rows; y++) {
    for (let x = 0; x < GRID.cols; x++) {
      const key = cellKey({ x, y })
      if (TERRAIN[y]![x] !== 'grass' || STATIC_BLOCKED.has(key)) reserved.add(key)
    }
  }
  // 非ブロックの装飾（茂み）も敵が重ならないよう予約。
  for (const obj of MAP_OBJECTS) reserved.add(cellKey({ x: obj.x, y: obj.y }))
  return reserved
}

/** 敵を置かない予約セル（プレイヤー初期位置/地形障害/家/装飾）。 */
export const RESERVED_CELLS: ReadonlySet<string> = buildReserved()

export interface GridConfig {
  cols: number
  rows: number
  /** 配置不可セル("x,y")。 */
  blocked?: ReadonlySet<string>
}

// Knuth乗算ハッシュ。Math.imul で 32bit に収め、大きな issue 番号でも決定性を保つ。
const HASH_MULTIPLIER = 2654435761

/** issue番号を [0, total) のセルインデックスへ決定的に写像する。 */
export function seedIndex(issueNumber: number, total: number): number {
  if (total <= 0) return 0
  const hashed = Math.imul(issueNumber, HASH_MULTIPLIER) >>> 0
  return hashed % total
}

function indexToCell(index: number, cols: number): Cell {
  return { x: index % cols, y: Math.floor(index / cols) }
}

export interface PlaceableEnemy {
  id: number
  issueNumber: number
}

/**
 * 敵を決定的にグリッド配置する。
 * issue番号をシードに初期セルを決め、衝突は線形プロービングで回避する。
 * 予約セル（プレイヤー初期位置/ランドマーク/地形障害）と配置済みセルは避ける。
 * 同一入力に対して常に同じ結果を返す（issue番号昇順で安定化）。
 */
export function placeEnemies(
  enemies: readonly PlaceableEnemy[],
  grid: GridConfig = { cols: GRID.cols, rows: GRID.rows, blocked: RESERVED_CELLS },
): Map<number, Cell> {
  const total = grid.cols * grid.rows
  const occupied = new Set<string>(grid.blocked ?? [])
  const result = new Map<number, Cell>()
  // 重複issue番号を除去しつつ、決定性のため issueNumber 昇順で処理する。
  const seen = new Set<number>()
  const sorted = [...enemies]
    .filter((enemy) => {
      if (seen.has(enemy.issueNumber)) return false
      seen.add(enemy.issueNumber)
      return true
    })
    .sort((a, b) => a.issueNumber - b.issueNumber)

  for (const enemy of sorted) {
    let index = seedIndex(enemy.issueNumber, total)
    for (let probe = 0; probe < total; probe++) {
      const cell = indexToCell(index, grid.cols)
      const key = cellKey(cell)
      if (!occupied.has(key)) {
        occupied.add(key)
        result.set(enemy.id, cell)
        break
      }
      index = (index + 1) % total
    }
  }
  return result
}

const DELTA: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export interface Bounds {
  cols: number
  rows: number
}

/**
 * dir方向に1マス移動した結果セルを返す。
 * 盤面外・blockedセルへは進めず、現在位置を維持する。
 */
export function step(
  pos: Cell,
  dir: Direction,
  bounds: Bounds = GRID,
  blocked?: ReadonlySet<string>,
): Cell {
  const delta = DELTA[dir]
  const next: Cell = { x: pos.x + delta.x, y: pos.y + delta.y }
  if (next.x < 0 || next.y < 0 || next.x >= bounds.cols || next.y >= bounds.rows) {
    return pos
  }
  if (blocked?.has(cellKey(next))) {
    return pos
  }
  return next
}

/** 指定セルに居る敵のenemyIdを返す（配置の逆引き）。居なければ null。 */
export function enemyAtCell(cell: Cell, placements: ReadonlyMap<number, Cell>): number | null {
  for (const [id, placed] of placements) {
    if (placed.x === cell.x && placed.y === cell.y) return id
  }
  return null
}

/**
 * dir方向の隣接セルを返す（盤面外なら null）。
 * step と違いblockedや現在位置維持はせず、インタラクト対象セルの参照に使う。
 */
export function neighborCell(pos: Cell, dir: Direction, bounds: Bounds = GRID): Cell | null {
  const delta = DELTA[dir]
  const next: Cell = { x: pos.x + delta.x, y: pos.y + delta.y }
  if (next.x < 0 || next.y < 0 || next.x >= bounds.cols || next.y >= bounds.rows) {
    return null
  }
  return next
}

/** 指定セルにあるランドマーク種別を返す。無ければ null。 */
export function landmarkAtCell(cell: Cell): LandmarkKind | null {
  for (const kind of Object.keys(LANDMARKS) as LandmarkKind[]) {
    const landmark = LANDMARKS[kind]
    if (landmark.x === cell.x && landmark.y === cell.y) return kind
  }
  return null
}

/**
 * 移動不可セル（地形障害＋家＋ランドマーク＋敵の居るセル）の集合を返す。
 * これにより水/木/建物のマスには踏み込めず、隣接してインタラクトする操作モデルになる。
 */
export function blockedCells(placements: ReadonlyMap<number, Cell>): Set<string> {
  const blocked = new Set<string>(STATIC_BLOCKED)
  for (const landmark of Object.values(LANDMARKS)) blocked.add(cellKey(landmark))
  for (const cell of placements.values()) blocked.add(cellKey(cell))
  return blocked
}
