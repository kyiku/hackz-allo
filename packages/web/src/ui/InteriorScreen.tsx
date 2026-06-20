import { useEffect, type ReactNode } from 'react'
import { assetUrl } from '../assets/manifest'
import type { LandmarkKind } from '../map/grid'
import { LANDMARK_PROFILES } from '../npc/landmarks'

interface InteriorScreenProps {
  /** どの施設か（鍛冶屋/酒場/賢者）。 */
  kind: LandmarkKind
  /** 退店（マップへ戻る）。 */
  onClose: () => void
  /** 施設の機能パネル（鍛冶/酒場/ステータス編成）。 */
  children: ReactNode
}

/** 施設ごとの差し色（店主の肩書き/セリフ枠）。 */
const THEME: Record<LandmarkKind, { accent: string; bubble: string }> = {
  blacksmith: { accent: 'text-amber-300', bubble: 'border-amber-700/50 bg-amber-950/50' },
  tavern: { accent: 'text-orange-300', bubble: 'border-orange-700/50 bg-orange-950/50' },
  sage: { accent: 'text-violet-300', bubble: 'border-violet-700/50 bg-violet-950/50' },
}

/** 店内背景（build-interiors で生成した部屋PNG）のURL。 */
function interiorBg(kind: LandmarkKind): string {
  return `${import.meta.env.BASE_URL}assets/interiors/${kind}.png`
}

/**
 * お店/施設の「店内」全画面ビュー（タスク#117拡張）。
 * 背景は Kenney Tiny Dungeon(CC0) のタイルで合成した部屋PNG（床/壁/家具）。
 * その上に店主の立ち絵＋名前＋挨拶、機能パネルを重ねる。Escape／「店を出る」でマップへ戻る。
 */
export function InteriorScreen({ kind, onClose, children }: InteriorScreenProps) {
  const profile = LANDMARK_PROFILES[kind]
  const theme = THEME[kind]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-label={`${profile.place} — ${profile.name}`}
    >
      {/* 部屋の背景（ピクセルパーフェクトに拡大）＋可読性のための暗幕 */}
      <img
        src={interiorBg(kind)}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ imageRendering: 'pixelated' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/45 to-slate-950/75"
      />

      <div className="relative flex h-full flex-col">
        {/* 上部バー: 施設名 + 退店 */}
        <div className="flex items-center justify-between border-b-2 border-rpg-frame-dark bg-black/40 px-5 py-3 backdrop-blur-sm">
          <h2 className="flex items-center gap-2 text-lg text-rpg-gold">
            <span aria-hidden>{profile.emoji}</span>
            {profile.place}
          </h2>
          <button type="button" onClick={onClose} className="rpg-btn rpg-btn-ghost px-3 py-1.5">
            店を出る（Esc）
          </button>
        </div>

        {/* 本体: 店主ヘッダ + 機能パネル */}
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6">
          <div className="flex w-full max-w-2xl flex-col gap-5">
            <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/50 p-4 backdrop-blur-sm">
              <img
                src={assetUrl(profile.asset)}
                alt={profile.name}
                className="h-20 w-20 shrink-0 rounded-lg bg-black/40 p-1.5"
                style={{ imageRendering: 'pixelated' }}
              />
              <div className="min-w-0">
                <p className={`text-xs font-semibold ${theme.accent}`}>{profile.role}</p>
                <p className="text-xl font-bold">{profile.name}</p>
                <p
                  className={`mt-2 rounded-lg border px-3 py-2 text-sm text-slate-100 ${theme.bubble}`}
                >
                  「{profile.greeting}」
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-950/55 p-1 backdrop-blur-sm">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
