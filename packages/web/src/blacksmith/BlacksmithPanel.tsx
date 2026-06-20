import type { Enemy } from '@github-issue-rpg/shared'
import { useState } from 'react'
import { forgeableEnemies } from './selection'
import type { BattleLike } from './selection'

interface BlacksmithPanelProps {
  enemies: Enemy[]
  battles: BattleLike[]
  /** 依頼確定時に呼ぶ（issue番号で鍛冶屋依頼＝戦闘開始）。 */
  onForge: (issueNumber: number) => void
}

/**
 * 鍛冶屋UI（タスク10.4）。
 * 依頼可能な open issue（敵）を選択し、依頼ボタンで `cmd.forge` を送出する。
 */
export function BlacksmithPanel({ enemies, battles, onForge }: BlacksmithPanelProps) {
  const candidates = forgeableEnemies(enemies, battles)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // 選択中の敵が候補から外れた（依頼済み/撃破）場合は選択を解除する。
  const selected = candidates.find((enemy) => enemy.id === selectedId) ?? null

  function requestForge() {
    if (!selected) return
    onForge(selected.issueNumber)
    setSelectedId(null)
  }

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <header className="flex items-center gap-2">
        <span className="text-xl">🔨</span>
        <h3 className="text-base font-semibold text-slate-200">鍛冶屋</h3>
      </header>

      {candidates.length === 0 ? (
        <p className="text-sm text-slate-500">依頼できるissueがありません。</p>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            対象issue
            <select
              value={selectedId ?? ''}
              onChange={(event) =>
                setSelectedId(event.target.value === '' ? null : Number(event.target.value))
              }
              className="rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
            >
              <option value="">— 選択してください —</option>
              {candidates.map((enemy) => (
                <option key={enemy.id} value={enemy.id}>
                  #{enemy.issueNumber} {enemy.title}（{enemy.difficulty}・HP {enemy.hpTotal}）
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={requestForge}
            disabled={!selected}
            className="self-start rounded bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            鍛冶屋に依頼する
          </button>
        </>
      )}
    </article>
  )
}
