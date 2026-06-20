import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Direction } from '../map/grid'

interface TouchControlsProps {
  /** 方向移動（スワイプで1マスずつ）。 */
  onMove: (dir: Direction) => void
  /** 決定（隣接NPCに話しかける）。 */
  onAction: () => void
}

/** 1マス進むのに必要なスワイプ距離(px)。これを超えるたびに1歩進む（連続ドラッグ対応）。 */
const STEP_PX = 46

/**
 * モバイル/タッチ向けの操作（タスク#117拡張・フリック入力版）。
 * マップ上をスワイプ/フリックすると、その方向へ移動する（ドラッグし続ければ距離に応じて連続移動）。
 * 会話は右下の「決定」ボタン。十字キーを廃したのでマップがボタンで隠れない。
 * 小画面(<lg)のときだけ表示。スワイプ面は透明でHUDより背面（HUDはタップ可能）。
 */
export function TouchControls({ onMove, onAction }: TouchControlsProps) {
  const active = useRef(false)
  const lastX = useRef(0)
  const lastY = useRef(0)

  const onPointerDown = useCallback((event: ReactPointerEvent) => {
    active.current = true
    lastX.current = event.clientX
    lastY.current = event.clientY
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      if (!active.current) return
      let dx = event.clientX - lastX.current
      let dy = event.clientY - lastY.current
      // しきい値を超えた分だけ歩を進める（速いフリックでも遅いドラッグでも自然に動く）。
      while (Math.max(Math.abs(dx), Math.abs(dy)) >= STEP_PX) {
        if (Math.abs(dx) >= Math.abs(dy)) {
          onMove(dx > 0 ? 'right' : 'left')
          const step = Math.sign(dx) * STEP_PX
          lastX.current += step
          dx -= step
        } else {
          onMove(dy > 0 ? 'down' : 'up')
          const step = Math.sign(dy) * STEP_PX
          lastY.current += step
          dy -= step
        }
      }
    },
    [onMove],
  )

  const stop = useCallback(() => {
    active.current = false
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-30 lg:hidden">
      {/* スワイプ面（マップ全体・透明）。touch-none でブラウザのスクロール/更新を抑止。 */}
      <div
        className="pointer-events-auto absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        aria-hidden
      />

      {/* 決定ボタン（右下） */}
      <button
        type="button"
        aria-label="決定（話しかける）"
        onPointerDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onAction()
        }}
        onContextMenu={(e) => e.preventDefault()}
        className="pointer-events-auto absolute bottom-8 right-6 flex h-[4.5rem] w-[4.5rem] touch-none select-none items-center justify-center rounded-full border-2 border-rpg-frame-dark bg-rpg-gold font-pixel text-sm text-[#3a2a08] shadow-btn active:translate-y-0.5 active:shadow-btn-pressed"
      >
        決定
      </button>
    </div>
  )
}
