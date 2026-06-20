import type { Enemy } from '@github-issue-rpg/shared'
import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { GRID } from './grid'
import { MapScene, type InteractHandler } from './MapScene'

interface MapViewProps {
  enemies: Enemy[]
  /** NPCインタラクト時のハンドラ（敵/鍛冶屋/酒場/賢者）。 */
  onInteract: InteractHandler
  /** モーダル表示中などマップ操作を止めるか（キー入力の誤反応防止）。 */
  paused?: boolean
}

/**
 * Phaserマップを React にマウントするラッパー（タスク#117）。
 * 親要素いっぱいにフルスクリーン表示（Scale.FIT＋pixelArtでピクセルパーフェクト）。
 * Phaser.Game の生成は一度だけ。敵集合の更新はシーンへ流し込み再描画する。
 * onInteract は ref 経由で最新を参照し、ゲーム再生成を避ける。
 */
export function MapView({ enemies, onInteract, paused = false }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<MapScene | null>(null)
  const onInteractRef = useRef(onInteract)
  onInteractRef.current = onInteract

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
}
