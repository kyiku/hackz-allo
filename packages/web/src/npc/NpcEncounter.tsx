import { useGameStore } from '../store/gameStore'
import { enemyName } from './enemyName'

interface NpcEncounterProps {
  enemyId: number
  /** 会話を閉じる（「とじる」）。 */
  onClose: () => void
  /** 「戦う」選択時。issue番号を渡し、戦闘開始（cmd.forge）と準備中表示は親が担う。 */
  onFight: (issueNumber: number) => void
}

/**
 * 敵（issue）NPCとの遭遇イベント（タスク#117）。
 * マップで敵に話しかけたときに開く。攻略情報（NPC会話）を聞き、「戦う」で鍛冶屋依頼（戦闘開始）する。
 */
export function NpcEncounter({ enemyId, onClose, onFight }: NpcEncounterProps) {
  const enemy = useGameStore((s) => s.enemies[enemyId])
  const dialogue = useGameStore((s) => s.npcDialogues[enemyId])
  const send = useGameStore((s) => s.send)

  if (!enemy) return <p className="text-sm text-rpg-muted">この敵はもういません。</p>

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-lg text-rpg-ink">{enemyName(enemy.difficulty, enemy.issueNumber)}</p>
        <p className="text-xs text-rpg-muted">
          #{enemy.issueNumber} {enemy.title}（{enemy.difficulty}・HP {enemy.hpTotal}）
        </p>
      </div>

      {dialogue ? (
        <dl className="rpg-panel flex flex-col gap-2 p-3 text-sm">
          <div>
            <dt className="rpg-label text-xs text-teal-400">要点</dt>
            <dd className="text-rpg-ink">{dialogue.summary}</dd>
          </div>
          <div>
            <dt className="rpg-label text-xs text-teal-400">難所</dt>
            <dd className="text-rpg-ink">{dialogue.difficultyNote}</dd>
          </div>
          <div>
            <dt className="rpg-label text-xs text-teal-400">勝利条件</dt>
            <dd className="text-rpg-ink">{dialogue.winCondition}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-rpg-muted">
          「話を聞く」で攻略情報（要点/難所/勝利条件）を聞けます。
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => send({ type: 'cmd.npc.talk', enemyId })}
          className="rpg-btn bg-teal-600"
        >
          話を聞く
        </button>
        <button
          type="button"
          onClick={() => onFight(enemy.issueNumber)}
          className="rpg-btn rpg-btn-amber"
        >
          戦う
        </button>
        <button type="button" onClick={onClose} className="rpg-btn rpg-btn-ghost ml-auto">
          とじる
        </button>
      </div>
    </div>
  )
}
