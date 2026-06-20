import { useSyncExternalStore } from 'react'
import { sound } from '../audio/sound'

/**
 * 音のミュート切替ボタン（タスク#117拡張）。
 * 状態は audio マネージャが保持（localStorage 永続）。表示専用。
 */
export function MuteButton() {
  const muted = useSyncExternalStore(
    (cb) => sound.subscribe(cb),
    () => sound.isMuted(),
    () => false,
  )
  return (
    <button
      type="button"
      aria-label={muted ? '音を出す' : '音を消す'}
      aria-pressed={muted}
      onClick={() => sound.toggleMuted()}
      className="rpg-window pointer-events-auto flex h-9 w-9 items-center justify-center font-pixel text-sm text-rpg-ink hover:text-rpg-gold"
      title={muted ? '音を出す' : '音を消す'}
    >
      {muted ? '🔇' : '🔊'}
    </button>
  )
}
