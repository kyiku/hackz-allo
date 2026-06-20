import { useGameStore } from '../store/gameStore'

/**
 * プレイヤー状態の常時表示HUD（タスク#117拡張）。
 * Lv／EXP／隊列／装備数をワールド画面の隅に出す（賢者の家でしか見られなかった情報を可視化）。
 * 表示専用：ストアの値を読むだけで、ゲームロジックには関与しない。
 */
export function PlayerHud() {
  const player = useGameStore((s) => s.player)
  const loadout = useGameStore((s) => s.loadout)
  const equipmentCount = useGameStore((s) => s.equipment.length)

  const level = player?.level ?? 1
  const exp = player?.exp ?? 0
  const party = loadout?.partySize ?? 1

  return (
    <div className="rpg-window pointer-events-auto flex items-center gap-3 px-3 py-1.5">
      <div className="flex items-baseline gap-1">
        <span className="font-pixel text-xs text-rpg-muted">Lv</span>
        <span className="font-pixel text-lg leading-none text-rpg-gold">{level}</span>
      </div>
      <span className="h-5 w-px bg-rpg-frame/50" aria-hidden />
      <dl className="flex items-center gap-3 font-pixel text-xs text-rpg-ink">
        <div className="flex items-center gap-1">
          <dt className="text-rpg-muted">EXP</dt>
          <dd>{exp}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="text-rpg-muted">隊列</dt>
          <dd>{party}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="text-rpg-muted">装備</dt>
          <dd>{equipmentCount}</dd>
        </div>
      </dl>
    </div>
  )
}
