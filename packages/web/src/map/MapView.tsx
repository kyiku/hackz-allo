import type { Enemy } from '@github-issue-rpg/shared'
import Phaser from 'phaser'
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { GRID, type Direction } from './grid'
import { MapScene, type InteractHandler } from './MapScene'

interface MapViewProps {
  enemies: Enemy[]
  /** NPCインタラクト時のハンドラ（敵/鍛冶屋/酒場/賢者）。 */
  onInteract: InteractHandler
  /** モーダル表示中などマップ操作を止めるか（キー入力の誤反応防止）。 */
  paused?: boolean
}

/** 画面パッド等から呼ぶマップ操作API（WorldScreen が ref 経由で利用）。 */
export interface MapControls {
  move(dir: Direction): void
  interact(): void
}

/**
 * Phaserマップを React にマウントするラッパー（タスク#117）。
 * 親要素いっぱいにフルスクリーン表示（Scale.FIT＋pixelArtでピクセルパーフェクト）。
 * Phaser.Game の生成は一度だけ。敵集合の更新はシーンへ流し込み再描画する。
 * onInteract は ref 経由で最新を参照し、ゲーム再生成を避ける。
 * 画面パッド用に move/interact を ref で公開する（タッチ操作対応）。
 */
export const MapView = forwardRef<MapControls, MapViewProps>(function MapView(
  { enemies, onInteract, paused = false },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<MapScene | null>(null)
  const onInteractRef = useRef(onInteract)
  onInteractRef.current = onInteract

  useImperativeHandle(
    ref,
    () => ({
      move: (dir) => sceneRef.current?.move(dir),
      interact: () => sceneRef.current?.interact(),
    }),
    [],
  )

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return
    const scene = new MapScene((target) => onInteractRef.current(target), import.meta.env.BASE_URL)
    sceneRef.current = scene
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: GRID.cols * GRID.tile,
      height: GRID.rows * GRID.tile,
      backgroundColor: '#0f172a',
      // ドット絵をにじませない（pixel-perfect表示）。
      pixelArt: true,
      // フィールド全体(width×height)をアスペクト比を保ったまま画面に収める（FIT）。
      // 画面より小さい余白はピルラー/レターボックスとして backgroundColor で塗られる。
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene,
    })
    return () => {
      sceneRef.current = null
      game.destroy(true)
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setEnemies(enemies)
  }, [enemies])

  useEffect(() => {
    sceneRef.current?.setInputEnabled(!paused)
  }, [paused])

  return <div ref={containerRef} className="h-full w-full" />
})
