import type { Enemy } from '@github-issue-rpg/shared'
import { useGameStore } from '../store/gameStore'
import { enemyName } from './enemyName'

/**
 * DEV/デモ限定の足場：バックエンドが無い「demo」ワールドでも戦闘画面を確認できるよう、
 * 「戦う」時にローカルで戦闘を1つ起こす。本番(cmd.forge→backend)のロジックには一切関与しない。
 */
function startDemoBattle(enemy: Enemy): void {
  const { world, ingest } = useGameStore.getState()
  if (!import.meta.env.DEV || world?.repoOwner !== 'demo') return
  const battleId = `demo-b${enemy.id}`
  ingest({ type: 'battle.started', battleId, enemyId: enemy.id, hpTotal: enemy.hpTotal })
  ingest({
    type: 'battle.log',
    battleId,
    line: `${enemyName(enemy.difficulty, enemy.issueNumber)} との戦闘開始！`,
    kind: 'system',
  })
  ingest({
    type: 'battle.log',
    battleId,
    line: '呪文（追加指示）を詠唱して攻略しよう。（デモ表示）',
    kind: 'info',
  })
}

interface NpcEncounterProps {
  enemyId: number
  /** 「戦う」選択時（cmd.forge 後にモーダルを閉じる）。 */
  onClose: () => void
}

/**
 * 敵（issue）NPCとの遭遇イベント（タスク#117）。
 * マップで敵に話しかけたときに開く。攻略情報（NPC会話）を聞き、「戦う」で鍛冶屋依頼（戦闘開始）する。
 */
export function NpcEncounter({ enemyId, onClose }: NpcEncounterProps) {
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

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => send({ type: 'cmd.npc.talk', enemyId })}
          className="rpg-btn bg-teal-600"
        >
          話を聞く
        </button>
        <button
          type="button"
          onClick={() => {
            send({ type: 'cmd.forge', issueNumber: enemy.issueNumber })
            startDemoBattle(enemy)
            onClose()
          }}
          className="rpg-btn rpg-btn-amber"
        >
          戦う
        </button>
      </div>
    </div>
  )
}
