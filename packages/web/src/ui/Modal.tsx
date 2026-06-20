import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * 汎用モーダル（タスク#117）。NPCインタラクトで開く各機能のオーバーレイ。
 * Escape／背景クリック／✕で閉じる。
 */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="rpg-window max-h-[85vh] w-full max-w-xl overflow-y-auto p-4"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2 border-b-2 border-rpg-frame/40 pb-2">
          <h2 className="text-lg text-rpg-gold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded px-2 py-1 font-pixel text-rpg-muted hover:text-rpg-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
