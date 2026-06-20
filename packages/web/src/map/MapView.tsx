import type { Enemy } from '@github-issue-rpg/shared'
import Phaser from 'phaser'
import { useEffect, useRef } from 'react'
import { GRID } from './grid'
import { MapScene } from './MapScene'

interface MapViewProps {
  enemies: Enemy[]
  /** 敵接触時のハンドラ（issue番号で鍛冶屋依頼＝戦闘開始）。 */
  onEngage: (issueNumber: number) => void
}

/**
 * Phaserマップを React にマウントするラッパー（タスク10.2）。
 * Phaser.Game の生成は一度だけ。敵集合の更新はシーンへ流し込み再描画する。
 * onEngage は ref 経由で最新を参照し、ゲーム再生成を避ける。
 */
export function MapView({ enemies, onEngage }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<MapScene | null>(null)
  const onEngageRef = useRef(onEngage)
  onEngageRef.current = onEngage

  useEffect(() => {
    const parent = containerRef.current
    if (!parent) return
    const scene = new MapScene((issueNumber) => onEngageRef.current(issueNumber))
    sceneRef.current = scene
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: GRID.cols * GRID.tile,
      height: GRID.rows * GRID.tile,
      backgroundColor: '#0f172a',
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

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className="overflow-hidden rounded-lg border border-slate-700"
        style={{ width: GRID.cols * GRID.tile, height: GRID.rows * GRID.tile }}
      />
      <p className="text-xs text-slate-500">
        矢印キー / WASD で移動。敵に接触すると鍛冶屋依頼（戦闘）が始まります。
      </p>
    </div>
  )
}
