import type { Enemy } from '@github-issue-rpg/shared'
import Phaser from 'phaser'
import {
  enemyAtCell,
  GRID,
  LANDMARKS,
  placeEnemies,
  PLAYER_START,
  RESERVED_CELLS,
  step,
  type Cell,
  type Direction,
} from './grid'

/** 敵に接触したときに呼ぶハンドラ（issue番号で鍛冶屋依頼＝戦闘へ）。 */
export type EngageHandler = (issueNumber: number) => void

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

const DIFFICULTY_COLOR: Record<Enemy['difficulty'], number> = {
  easy: 0x34d399,
  normal: 0x60a5fa,
  hard: 0xf59e0b,
  boss: 0xf43f5e,
}

/**
 * RPG風マップのPhaserシーン。
 * 背景グリッド＋ランドマーク（鍛冶屋/酒場）＋敵スプライト＋プレイヤーを描画し、
 * 矢印/WASDキーでグリッド移動、敵セルへの進入で `engage` を呼ぶ。
 * 描画ロジックの判定部は grid.ts の純関数に委譲している。
 */
export class MapScene extends Phaser.Scene {
  private readonly engage: EngageHandler
  private enemies: Enemy[] = []
  private placements = new Map<number, Cell>()
  private player: Cell = { ...PLAYER_START }
  private layer?: Phaser.GameObjects.Container
  private ready = false

  constructor(engage: EngageHandler) {
    super('map')
    this.engage = engage
  }

  /** 敵集合を差し替える。create前に呼ばれても保持し、create後は即再描画する。 */
  setEnemies(enemies: Enemy[]): void {
    this.enemies = enemies
    this.placements = placeEnemies(
      enemies.map((enemy) => ({ id: enemy.id, issueNumber: enemy.issueNumber })),
      { cols: GRID.cols, rows: GRID.rows, blocked: RESERVED_CELLS },
    )
    if (this.ready) this.redraw()
  }

  create(): void {
    this.layer = this.add.container(0, 0)
    this.ready = true
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.onKey(event))
    this.redraw()
  }

  private onKey(event: KeyboardEvent): void {
    const dir = KEY_TO_DIR[event.key]
    if (!dir) return
    const target = step(this.player, dir, GRID)
    const enemyId = enemyAtCell(target, this.placements)
    if (enemyId !== null) {
      // 敵セルへは踏み込まず戦闘へ遷移する。
      const enemy = this.enemies.find((candidate) => candidate.id === enemyId)
      if (enemy) this.engage(enemy.issueNumber)
      return
    }
    if (target.x === this.player.x && target.y === this.player.y) return
    this.player = target
    this.redraw()
  }

  private redraw(): void {
    if (!this.layer) return
    this.layer.removeAll(true)
    this.drawGrid()
    this.drawLandmark(LANDMARKS.blacksmith, '🔨', 0x78716c)
    this.drawLandmark(LANDMARKS.tavern, '🍺', 0x92400e)
    for (const enemy of this.enemies) {
      const cell = this.placements.get(enemy.id)
      if (cell) this.drawEnemy(enemy, cell)
    }
    this.drawPlayer()
  }

  private add2layer(object: Phaser.GameObjects.GameObject): void {
    this.layer?.add(object)
  }

  private drawGrid(): void {
    const graphics = this.add.graphics()
    graphics.lineStyle(1, 0x1e293b, 1)
    for (let x = 0; x <= GRID.cols; x++) {
      graphics.lineBetween(x * GRID.tile, 0, x * GRID.tile, GRID.rows * GRID.tile)
    }
    for (let y = 0; y <= GRID.rows; y++) {
      graphics.lineBetween(0, y * GRID.tile, GRID.cols * GRID.tile, y * GRID.tile)
    }
    this.add2layer(graphics)
  }

  private cellCenter(cell: Cell): { cx: number; cy: number } {
    return { cx: cell.x * GRID.tile + GRID.tile / 2, cy: cell.y * GRID.tile + GRID.tile / 2 }
  }

  private drawLandmark(cell: Cell, glyph: string, color: number): void {
    const { cx, cy } = this.cellCenter(cell)
    const rect = this.add.rectangle(cx, cy, GRID.tile - 6, GRID.tile - 6, color, 0.5)
    const text = this.add.text(cx, cy, glyph, { fontSize: '22px' }).setOrigin(0.5)
    this.add2layer(rect)
    this.add2layer(text)
  }

  private drawEnemy(enemy: Enemy, cell: Cell): void {
    const { cx, cy } = this.cellCenter(cell)
    const defeated = enemy.status === 'defeated'
    const color = defeated ? 0x475569 : DIFFICULTY_COLOR[enemy.difficulty]
    const rect = this.add.rectangle(
      cx,
      cy,
      GRID.tile - 8,
      GRID.tile - 8,
      color,
      defeated ? 0.4 : 0.9,
    )
    rect.setStrokeStyle(2, 0x0f172a)
    const label = this.add
      .text(cx, cy + GRID.tile / 2 - 6, `#${enemy.issueNumber}`, {
        fontSize: '10px',
        color: '#e2e8f0',
      })
      .setOrigin(0.5)
    this.add2layer(rect)
    this.add2layer(label)
  }

  private drawPlayer(): void {
    const { cx, cy } = this.cellCenter(this.player)
    const circle = this.add.circle(cx, cy, GRID.tile / 2 - 8, 0xfacc15)
    circle.setStrokeStyle(2, 0x713f12)
    this.add2layer(circle)
  }
}
