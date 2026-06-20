import { useEffect } from 'react'

interface TitleScreenProps {
  /** 「はじめる」押下（リポジトリ選択へ進む）。 */
  onStart: () => void
}

/**
 * タイトル画面（タスク#117拡張）。
 * ゲーム開始の入口。ここから「はじめる」でリポジトリ選択→ワールド参加へ進む。
 */
export function TitleScreen({ onStart }: TitleScreenProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') onStart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onStart])

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center gap-10 overflow-hidden bg-gradient-to-b from-rpg-bg via-[#101a36] to-emerald-950 text-rpg-ink">
      {/* 背景の星屑風ドット */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="relative text-center">
        <p className="mb-3 font-pixel text-sm tracking-[0.4em] text-rpg-gold">⚔ PRESS START ⚔</p>
        <h1 className="font-pixel text-5xl leading-tight tracking-wide text-rpg-ink drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] sm:text-6xl">
          <span className="text-rpg-gold">GitHub</span> Issue RPG
        </h1>
        <p className="mt-5 text-base text-rpg-muted">issue を敵に、TDD を戦闘に。</p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="rpg-btn rpg-btn-gold relative px-10 py-3 text-base"
      >
        <span aria-hidden>▶</span> はじめる
      </button>
      <p className="relative font-pixel text-xs text-rpg-muted">Enter / Space でも開始できます</p>
    </div>
  )
}
