import type { Enemy } from '@github-issue-rpg/shared'
import Phaser from 'phaser'
import { assetUrl, enemyAssetKey, type AssetKey } from '../assets/manifest'
import {
  blockedCells,
  cellKey,
  enemyAtCell,
  GRID,
  HOUSES,
  HOUSE_TILES,
  landmarkAtCell,
  MAP_OBJECTS,
  neighborCell,
  PATH,
  placeEnemies,
  PLAYER_START,
  RESERVED_CELLS,
  step,
  terrainAt,
  WATER,
  type Cell,
  type Direction,
  type House,
  type LandmarkKind,
} from './grid'
import { BRIDGE, GRASS, GRASS_DETAILS, GRASS_PLAIN, pickAutoTile, TILE_SRC } from './tileset'

/**
 * 決定キーでインタラクトした対象。Appがこれを見て対応するモーダル/イベントを開く。
 * 敵→NPC会話＋戦闘、blacksmith→鍛冶屋、tavern→酒場、sage→ステータス/編成。
 */
export type InteractTarget =
  | { kind: 'enemy'; enemyId: number; issueNumber: number }
  | { kind: LandmarkKind }

/** インタラクト発火ハンドラ。 */
export type InteractHandler = (target: InteractTarget) => void

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

const INTERACT_KEYS = new Set([' ', 'Enter'])

/**
 * カメラズーム倍率。フィールド全体を画面に収めるため等倍(1)とする。
 * FIT スケール（MapView）がワールド全体をアスペクト比を保って画面にフィットさせる。
 */
const CAMERA_ZOOM = 1

/** preload で読み込むキャラ/敵テクスチャ（Tiny Dungeonの個別PNG）。背景は 'tiles' シート。 */
const SPRITE_KEYS: AssetKey[] = ['player', 'enemy-easy', 'enemy-normal', 'enemy-hard', 'enemy-boss']

/** 背景タイルシート（Kenney RPG Pack, 64px）のテクスチャキー。 */
const TILES_KEY: AssetKey = 'tiles'

/** 敵の難易度→脅威度を示すリング色。 */
const DIFFICULTY_COLOR: Record<Enemy['difficulty'], number> = {
  easy: 0x4ade80,
  normal: 0x38bdf8,
  hard: 0xa78bfa,
  boss: 0xf4d06a,
}

/**
 * RPG風マップのPhaserシーン（タスク#117）。
 * 草地ベースに川/橋・土の道・木立・木造の家・小物をタイルで描画し、矢印/WASDで歩行移動。
 * 静的な背景（地形/オブジェクト/家）は一度だけ描き、敵/プレイヤーだけ毎手番で再描画する。
 * 水/木/建物のマスには踏み込めず、隣接して決定キー（Space/Enter）でインタラクトする。判定は grid.ts に委譲。
 */
export class MapScene extends Phaser.Scene {
  private readonly onInteract: InteractHandler
  private readonly base: string
  private enemies: Enemy[] = []
  private placements = new Map<number, Cell>()
  private player: Cell = { ...PLAYER_START }
  private facing: Direction = 'down'
  private staticLayer?: Phaser.GameObjects.Container
  private entityLayer?: Phaser.GameObjects.Container
  private ready = false
  private inputEnabled = true
  /** 草地装飾を置かないセル（家/オブジェクトの下）。 */
  private readonly decalSkip: Set<string> = MapScene.buildDecalSkip()

  private static buildDecalSkip(): Set<string> {
    const skip = new Set<string>()
    for (const house of HOUSES) {
      for (let dy = 0; dy < house.h; dy++) {
        for (let dx = 0; dx < house.w; dx++) skip.add(cellKey({ x: house.x + dx, y: house.y + dy }))
      }
    }
    for (const obj of MAP_OBJECTS) skip.add(cellKey({ x: obj.x, y: obj.y }))
    return skip
  }

  constructor(onInteract: InteractHandler, base = '/') {
    super('map')
    this.onInteract = onInteract
    this.base = base
  }

  /** 敵集合を差し替える。create前に呼ばれても保持し、create後は即再描画する。 */
  setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies
    this.placements = placeEnemies(
      enemies.map((enemy) => ({ id: enemy.id, issueNumber: enemy.issueNumber })),
      { cols: GRID.cols, rows: GRID.rows, blocked: RESERVED_CELLS },
    )
    if (this.ready) this.drawEntities()
  }

  preload(): void {
    for (const key of SPRITE_KEYS) {
      this.load.image(key, assetUrl(key, this.base))
    }
    this.load.spritesheet(TILES_KEY, assetUrl(TILES_KEY, this.base), {
      frameWidth: TILE_SRC,
      frameHeight: TILE_SRC,
    })
  }

  create(): void {
    this.staticLayer = this.add.container(0, 0)
    this.entityLayer = this.add.container(0, 0)
    this.ready = true
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.onKey(event))
    // カメラ: 等倍でフィールド全体を表示（境界=ワールド全体なのでスクロールしない）。
    this.cameras.main.setBounds(0, 0, this.mapWidth(), this.mapHeight())
    this.cameras.main.setZoom(CAMERA_ZOOM)
    this.drawStatic()
    this.drawEntities()
  }

  /** モーダル表示中など、マップ操作を一時無効化する（入力フィールドへの誤反応を防ぐ）。 */
  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled
  }

  private onKey(event: KeyboardEvent): void {
    if (INTERACT_KEYS.has(event.key)) {
      this.interact()
      return
    }
    const dir = KEY_TO_DIR[event.key]
    if (dir) this.move(dir)
  }

  /**
   * 1マス移動する（キーボード／画面パッド共通の入口）。
   * 進めなくても向きだけ更新して再描画する。モーダル中などは無効。
   */
  move(dir: Direction): void {
    if (!this.inputEnabled) return
    this.facing = dir
    const blocked = blockedCells(this.placements)
    this.player = step(this.player, dir, GRID, blocked)
    this.drawEntities()
  }

  /** 向いている隣接セルのNPC（敵/鍛冶屋/酒場/賢者）を判定し、インタラクトを発火する（決定キー／決定ボタン）。 */
  interact(): void {
    if (!this.inputEnabled) return
    const front = neighborCell(this.player, this.facing, GRID)
    if (!front) return
    const enemyId = enemyAtCell(front, this.placements)
    if (enemyId !== null) {
      const enemy = this.enemies.find((candidate) => candidate.id === enemyId)
      if (enemy)
        this.onInteract({ kind: 'enemy', enemyId: enemy.id, issueNumber: enemy.issueNumber })
      return
    }
    const landmark = landmarkAtCell(front)
    if (landmark) this.onInteract({ kind: landmark })
  }

  private mapWidth(): number {
    return GRID.cols * GRID.tile
  }

  private mapHeight(): number {
    return GRID.rows * GRID.tile
  }

  private cellCenter(cell: Cell): { cx: number; cy: number } {
    return { cx: cell.x * GRID.tile + GRID.tile / 2, cy: cell.y * GRID.tile + GRID.tile / 2 }
  }

  // ----- 静的レイヤー（地形 / オブジェクト / 家）。一度だけ描く -----

  private drawStatic(): void {
    if (!this.staticLayer) return
    this.staticLayer.removeAll(true)
    if (!this.textures.exists(TILES_KEY)) {
      // タイル未ロード時は草色一枚でフォールバック。
      const w = this.mapWidth()
      const h = this.mapHeight()
      this.staticLayer.add(this.add.rectangle(w / 2, h / 2, w, h, 0x5a8c3a))
      return
    }
    this.drawTerrain()
    this.drawObjects()
    for (const house of HOUSES) this.drawHouse(house)
    this.drawWaterSparkles()
  }

  /** 水面に小さなきらめきを散らして川を生き生きさせる（reduced-motion時は描かない）。 */
  private drawWaterSparkles(): void {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    let n = 0
    for (let y = 0; y < GRID.rows; y++) {
      for (let x = 0; x < GRID.cols; x++) {
        if (terrainAt(x, y) !== 'water') continue
        n++
        if (n % 3 !== 0) continue // 1/3 のセルだけに置いて軽量に保つ。
        const { cx, cy } = this.cellCenter({ x, y })
        const ox = ((n * 53) % 20) - 10
        const oy = ((n * 31) % 16) - 8
        const sparkle = this.add.ellipse(
          cx + ox,
          cy + oy,
          GRID.tile * 0.2,
          GRID.tile * 0.1,
          0xffffff,
          0,
        )
        this.staticLayer?.add(sparkle)
        this.tweens.add({
          targets: sparkle,
          alpha: { from: 0, to: 0.55 },
          duration: 1100,
          delay: (n * 137) % 2200,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.inOut',
        })
      }
    }
  }

  /** タイル1枚を静的レイヤーへ描く（隙間防止に +1）。 */
  private putTile(cell: Cell, frame: number, dyCells = 0): Phaser.GameObjects.Image {
    const { cx, cy } = this.cellCenter(cell)
    const image = this.add
      .image(cx, cy + dyCells * GRID.tile, TILES_KEY, frame)
      .setDisplaySize(GRID.tile + 1, GRID.tile + 1)
    this.staticLayer?.add(image)
    return image
  }

  /** 草地マスのフレームを決定的に散らす（単調さ解消）。オブジェクト下は無地でよい。 */
  private grassFrame(x: number, y: number): number {
    if (this.decalSkip.has(cellKey({ x, y }))) return GRASS
    // 決定的ハッシュで一部だけ無地/装飾に差し替える。
    const h = (x * 73856093) ^ (y * 19349663)
    const r = (h >>> 0) % 17
    if (r === 0 || r === 5) return GRASS_DETAILS[r === 0 ? 0 : 1] ?? GRASS
    if (r === 9 || r === 13) return GRASS_PLAIN
    return GRASS
  }

  private drawTerrain(): void {
    const isPathLike = (x: number, y: number) => {
      const t = terrainAt(x, y)
      return t === 'path' || t === 'bridge'
    }
    const isWaterLike = (x: number, y: number) => {
      const t = terrainAt(x, y)
      return t === 'water' || t === 'bridge'
    }
    for (let y = 0; y < GRID.rows; y++) {
      for (let x = 0; x < GRID.cols; x++) {
        const cell = { x, y }
        // ベースは草地（少しだけ装飾を散らす）。
        this.putTile(cell, this.grassFrame(x, y))
        const t = terrainAt(x, y)
        if (t === 'water' || t === 'bridge') {
          // 水/橋の下は川（オートタイルで縁取り）。
          const frame = pickAutoTile(
            WATER,
            isWaterLike(x, y - 1),
            isWaterLike(x, y + 1),
            isWaterLike(x - 1, y),
            isWaterLike(x + 1, y),
          )
          this.putTile(cell, frame)
          if (t === 'bridge') this.putTile(cell, BRIDGE)
        } else if (t === 'path') {
          const frame = pickAutoTile(
            PATH,
            isPathLike(x, y - 1),
            isPathLike(x, y + 1),
            isPathLike(x - 1, y),
            isPathLike(x + 1, y),
          )
          this.putTile(cell, frame)
        }
      }
    }
  }

  /** 設置物の足元に楕円の影を落として地面に馴染ませる。 */
  private addShadow(
    layer: Phaser.GameObjects.Container | undefined,
    cell: Cell,
    widthRatio = 0.6,
    yOffset = 0.3,
  ): void {
    const { cx, cy } = this.cellCenter(cell)
    const shadow = this.add.ellipse(
      cx,
      cy + GRID.tile * yOffset,
      GRID.tile * widthRatio,
      GRID.tile * 0.24,
      0x000000,
      0.28,
    )
    layer?.add(shadow)
  }

  private drawObjects(): void {
    for (const obj of MAP_OBJECTS) {
      // 足元に影。
      this.addShadow(
        this.staticLayer,
        { x: obj.x, y: obj.y },
        obj.canopy !== undefined ? 0.5 : 0.55,
      )
      // 木は樹冠を1マス上に重ねて高さを出す。
      if (obj.canopy !== undefined) {
        this.putTile({ x: obj.x, y: obj.y }, obj.canopy, -1)
      }
      this.putTile({ x: obj.x, y: obj.y }, obj.frame)
    }
  }

  private drawHouse(house: House): void {
    const { x, y, w, h } = house
    // 足元（最下段）に横長の影。
    const baseY = y + h - 1
    for (let dx = 0; dx < w; dx++)
      this.addShadow(this.staticLayer, { x: x + dx, y: baseY }, 0.92, 0.34)
    // 鍛冶屋は石造（灰色）、他は木造（茶色）。
    const isStone = house.kind === 'blacksmith'
    const roof = isStone ? HOUSE_TILES.roofGray : HOUSE_TILES.roof
    const wall = isStone ? HOUSE_TILES.wallGray : HOUSE_TILES.wall
    // 屋根（最上段）。
    for (let dx = 0; dx < w; dx++) this.putTile({ x: x + dx, y }, roof)
    // 壁（残り段）。
    for (let dy = 1; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) this.putTile({ x: x + dx, y: y + dy }, wall)
    }
    // 窓（扉のない壁段の左右）。2階建ては各階に付く。
    for (let dy = 1; dy < h - 1; dy++) {
      this.putTile({ x, y: y + dy }, HOUSE_TILES.window)
      this.putTile({ x: x + w - 1, y: y + dy }, HOUSE_TILES.window)
    }
    // 扉（最下段中央）。
    const doorX = x + Math.floor(w / 2)
    const doorY = y + h - 1
    this.putTile({ x: doorX, y: doorY }, HOUSE_TILES.door)

    // 種別ごとの装飾で形を差別化する。
    if (house.kind === 'blacksmith') this.drawChimney(x + w - 1, y)
    if (house.kind === 'sage') this.drawGable(x, y, w)
    if (house.kind === 'tavern') this.drawInnSign(doorX, y)
  }

  /** 鍛冶屋の煙突＋立ち上る煙。 */
  private drawChimney(cellX: number, cellY: number): void {
    const { cx, cy } = this.cellCenter({ x: cellX, y: cellY })
    const t = GRID.tile
    const stack = this.add
      .rectangle(cx, cy - t * 0.25, t * 0.3, t * 0.55, 0x4a4a4a)
      .setStrokeStyle(2, 0x262626)
    this.staticLayer?.add(stack)
    const cap = this.add.rectangle(cx, cy - t * 0.5, t * 0.42, t * 0.16, 0x2f2f2f)
    this.staticLayer?.add(cap)
    // 立ち上る煙（上昇しながら薄くなるループ）。
    const baseY = cy - t * 0.55
    for (let i = 0; i < 3; i++) {
      const puff = this.add.circle(cx, baseY, t * 0.12, 0xd9d9d9, 0.0)
      this.staticLayer?.add(puff)
      this.tweens.add({
        targets: puff,
        y: baseY - t * 1.1,
        x: cx + (i % 2 === 0 ? -t * 0.18 : t * 0.18),
        scale: { from: 0.5, to: 1.4 },
        alpha: { from: 0.5, to: 0 },
        duration: 2200,
        delay: i * 700,
        repeat: -1,
        ease: 'Sine.out',
      })
    }
  }

  /** 賢者の家の切妻（とがり屋根）。 */
  private drawGable(x: number, y: number, w: number): void {
    const t = GRID.tile
    const left = x * t
    const right = (x + w) * t
    const apexX = (x + w / 2) * t
    const baseY = y * t + 2
    const apexY = y * t - t * 0.85
    const g = this.add.graphics()
    g.fillStyle(0x7c6fae, 1)
    g.fillTriangle(left, baseY, right, baseY, apexX, apexY)
    g.lineStyle(2, 0x4c3f7e)
    g.strokeTriangle(left, baseY, right, baseY, apexX, apexY)
    this.staticLayer?.add(g)
  }

  /** 酒場の INN 看板（扉の上）。 */
  private drawInnSign(doorX: number, roofY: number): void {
    const { cx, cy } = this.cellCenter({ x: doorX, y: roofY })
    const label = this.add
      .text(cx, cy - GRID.tile * 0.1, 'INN', {
        fontFamily: 'monospace',
        fontSize: `${Math.round(GRID.tile * 0.32)}px`,
        color: '#3b2412',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.staticLayer?.add(label)
  }

  // ----- エンティティレイヤー（敵 / プレイヤー）。毎手番で再描画 -----

  private drawEntities(): void {
    if (!this.entityLayer) return
    this.entityLayer.removeAll(true)
    this.enemies.forEach((enemy, index) => {
      const cell = this.placements.get(enemy.id)
      if (cell) this.drawEnemy(enemy, cell, index)
    })
    this.drawPlayer()
    this.drawInteractPrompt()
  }

  private drawEntitySprite(
    cell: Cell,
    key: AssetKey,
    size: number,
  ): Phaser.GameObjects.Image | null {
    if (!this.textures.exists(key)) return null
    const { cx, cy } = this.cellCenter(cell)
    const image = this.add.image(cx, cy, key).setDisplaySize(size, size)
    this.entityLayer?.add(image)
    return image
  }

  /** スプライトを上下にゆっくり揺らして生きている感を出す（次の再描画で破棄→再生成）。 */
  private bob(image: Phaser.GameObjects.Image, delayMs: number): void {
    this.tweens.add({
      targets: image,
      y: image.y - 3,
      duration: 820,
      delay: delayMs,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }

  private drawEnemy(enemy: Enemy, cell: Cell, index: number): void {
    this.addShadow(this.entityLayer, cell, 0.5, 0.34)
    const defeated = enemy.status === 'defeated'
    // 難易度色のリング（足元）で脅威度を一目で示す。撃破済みは描かない。
    if (!defeated) this.drawDifficultyRing(cell, enemy.difficulty)
    const image = this.drawEntitySprite(cell, enemyAssetKey(enemy.difficulty), GRID.tile - 4)
    if (!image) return
    if (defeated) {
      image.setAlpha(0.35).setTint(0x94a3b8)
    } else {
      this.bob(image, (index % 4) * 200)
      // 交戦中（HPが削れている）敵は頭上に小さなHPバー。
      if (enemy.hpCurrent < enemy.hpTotal && enemy.hpTotal > 0) {
        this.drawEnemyHp(cell, enemy.hpCurrent / enemy.hpTotal)
      }
    }
  }

  /** 敵の足元に難易度色のリングを敷く。 */
  private drawDifficultyRing(cell: Cell, difficulty: Enemy['difficulty']): void {
    const color = DIFFICULTY_COLOR[difficulty]
    const { cx, cy } = this.cellCenter(cell)
    const cyBase = cy + GRID.tile * 0.3
    // 外側のやわらかいグロー＋くっきりしたリングで脅威度を強調。
    const glow = this.add.ellipse(cx, cyBase, GRID.tile * 0.92, GRID.tile * 0.42, color, 0.18)
    const ring = this.add
      .ellipse(cx, cyBase, GRID.tile * 0.78, GRID.tile * 0.34)
      .setStrokeStyle(3, color, 1)
      .setFillStyle(color, 0.22)
    this.entityLayer?.add(glow)
    this.entityLayer?.add(ring)
  }

  /** 敵の頭上にHPバー（割合）。 */
  private drawEnemyHp(cell: Cell, ratio: number): void {
    const { cx, cy } = this.cellCenter(cell)
    const w = GRID.tile * 0.7
    const y = cy - GRID.tile * 0.5
    const bg = this.add.rectangle(cx, y, w, 5, 0x1b1b1b, 0.85).setStrokeStyle(1, 0x000000)
    const fillW = Math.max(1, w * Math.min(1, Math.max(0, ratio)))
    const fill = this.add.rectangle(cx - w / 2 + fillW / 2, y, fillW, 3, 0xef4444)
    this.entityLayer?.add(bg)
    this.entityLayer?.add(fill)
  }

  /** プレイヤーはキャラスプライト（Tiny Dungeonの勇者）＋向きを示す小ドット。 */
  private drawPlayer(): void {
    const { cx, cy } = this.cellCenter(this.player)
    this.addShadow(this.entityLayer, this.player, 0.5, 0.34)
    const drawn = this.drawEntitySprite(this.player, 'player', GRID.tile - 6)
    if (!drawn) {
      const circle = this.add
        .circle(cx, cy, GRID.tile / 2 - 10, 0xfacc15)
        .setStrokeStyle(2, 0x713f12)
      this.entityLayer?.add(circle)
    } else {
      if (this.facing === 'left') drawn.setFlipX(true)
      this.bob(drawn, 0)
    }

    const FACING_OFFSET: Record<Direction, [number, number]> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    }
    const [dx, dy] = FACING_OFFSET[this.facing]
    const edge = GRID.tile / 2 - 4
    const dot = this.add
      .circle(cx + dx * edge, cy + dy * edge, 3, 0xfacc15)
      .setStrokeStyle(1, 0x713f12)
    this.entityLayer?.add(dot)
  }

  /** 向いている隣接マスが会話可能（敵/施設）なら、頭上に揺れる目印を出す。 */
  private drawInteractPrompt(): void {
    const front = neighborCell(this.player, this.facing, GRID)
    if (!front) return
    const interactable =
      enemyAtCell(front, this.placements) !== null || landmarkAtCell(front) !== null
    if (!interactable) return
    const { cx, cy } = this.cellCenter(front)
    const marker = this.add
      .text(cx, cy - GRID.tile * 0.62, '▼', {
        fontFamily: 'monospace',
        fontSize: `${Math.round(GRID.tile * 0.42)}px`,
        color: '#f4d06a',
      })
      .setOrigin(0.5)
      .setStroke('#3a2a08', 4)
    this.entityLayer?.add(marker)
    this.tweens.add({
      targets: marker,
      y: marker.y - 5,
      duration: 480,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    })
  }
}
