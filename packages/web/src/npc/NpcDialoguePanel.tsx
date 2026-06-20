import type { Enemy, NpcDialogue } from '@github-issue-rpg/shared'
import { useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'

interface NpcDialoguePanelProps {
  enemies: Enemy[]
  dialogues: Record<number, NpcDialogue>
  /** 敵に話しかける（cmd.npc.talk）。 */
  onTalk: (enemyId: number) => void
}

/**
 * NPC会話UI（タスク10.9 / 要件5.3）。
 * 敵を選んで話しかけると、要点/難所/対象ファイル/勝利条件を表示する。
 */
export function NpcDialoguePanel({ enemies, dialogues, onTalk }: NpcDialoguePanelProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = enemies.find((enemy) => enemy.id === selectedId) ?? null
  const dialogue = selectedId !== null ? dialogues[selectedId] : undefined

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      {enemies.length === 0 ? (
        <p className="text-sm text-slate-500">話しかけられる敵がいません。</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select
            aria-label="話しかける敵"
            value={selectedId ?? ''}
            onChange={(event) =>
              setSelectedId(
                event.target.value === '' ? null : Number.parseInt(event.target.value, 10),
              )
            }
            className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
          >
            <option value="">— 話しかける敵を選択 —</option>
            {enemies.map((enemy) => (
              <option key={enemy.id} value={enemy.id}>
                #{enemy.issueNumber} {enemy.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="選択した敵に話しかける"
            onClick={() => selected && onTalk(selected.id)}
            disabled={!selected}
            className="rounded bg-teal-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            話しかける
          </button>
        </div>
      )}

      {selected &&
        (dialogue ? (
          <dl className="flex flex-col gap-2 rounded bg-slate-900/60 p-3 text-sm">
            <div>
              <dt className="text-xs font-semibold text-teal-400">要点</dt>
              <dd className="text-slate-200">{dialogue.summary}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-teal-400">難所</dt>
              <dd className="text-slate-200">{dialogue.difficultyNote}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-teal-400">対象ファイル</dt>
              <dd className="text-slate-200">
                {dialogue.files.length > 0 ? (
                  <ul className="list-inside list-disc">
                    {dialogue.files.map((file, index) => (
                      <li key={`${index}-${file}`}>
                        <code className="text-slate-300">{file}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-500">（特定なし）</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-teal-400">勝利条件</dt>
              <dd className="text-slate-200">{dialogue.winCondition}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">
            「話しかける」を押すと、この敵（issue）の攻略情報を聞けます。
          </p>
        ))}
    </article>
  )
}

/** ストア接続版。App から差し込む。 */
export function ConnectedNpcDialoguePanel() {
  const enemies = useGameStore((s) => s.enemies)
  const dialogues = useGameStore((s) => s.npcDialogues)
  const send = useGameStore((s) => s.send)
  // enemies 辞書が変わらない限り配列を作り直さない（不要な再描画を避ける）。
  const enemyList = useMemo(() => Object.values(enemies), [enemies])
  return (
    <NpcDialoguePanel
      enemies={enemyList}
      dialogues={dialogues}
      onTalk={(enemyId) => send({ type: 'cmd.npc.talk', enemyId })}
    />
  )
}
