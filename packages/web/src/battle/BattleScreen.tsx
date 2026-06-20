import { motion } from 'framer-motion'
import { useCallback, useState, type FormEvent } from 'react'
import { useGameStore } from '../store/gameStore'
import { battleStatusLabel, hpRatio, isBattleActive, logKindClass } from './presentation'

/**
 * 1戦闘の戦闘画面（要件 5.4/5.5/6.1）。
 * HPバー・RPG風ログ・呪文チャット欄・緊急停止ボタンを提供する。
 * 送信はストアの `send`（App が WS の send を注入）に統一する。
 */
export function BattleScreen({ battleId }: { battleId: string }) {
  const battle = useGameStore((s) => s.battles[battleId])
  const send = useGameStore((s) => s.send)
  const [spell, setSpell] = useState('')

  const castSpell = useCallback(
    (event: FormEvent) => {
      event.preventDefault()
      const message = spell.trim()
      if (!message) return
      send({ type: 'spell.cast', battleId, message })
      setSpell('')
    },
    [spell, battleId, send],
  )

  if (!battle) return null

  const active = isBattleActive(battle.status)
  const ratio = hpRatio(battle.hpCurrent, battle.hpTotal)

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <header className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-200">
          {battle.battleId}・{battleStatusLabel(battle.status)}
        </span>
        <button
          type="button"
          onClick={() => send({ type: 'cmd.stop', battleId })}
          disabled={!active}
          className="rounded bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
        >
          緊急停止
        </button>
      </header>

      <div>
        <div className="mb-1 flex justify-between text-xs text-slate-400">
          <span>HP</span>
          <span>
            {battle.hpCurrent}/{battle.hpTotal}
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded bg-slate-700">
          <motion.div
            className="h-full rounded bg-emerald-500"
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <ul className="flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded bg-slate-900/60 p-2 text-sm">
        {battle.logs.map((log) => (
          <li key={log.seq} className={logKindClass(log.kind)}>
            {log.line}
          </li>
        ))}
        {battle.logs.length === 0 && <li className="text-slate-500">まだログはありません。</li>}
      </ul>

      {battle.status === 'defeated' && battle.reward && (
        <p className="rounded bg-amber-500/20 px-3 py-2 text-sm text-amber-200">
          報酬獲得: {battle.reward.name}（{battle.reward.description}）
        </p>
      )}
      {battle.status === 'failed' && battle.failureReason && (
        <p className="rounded bg-rose-500/20 px-3 py-2 text-sm text-rose-200">
          失敗: {battle.failureReason}（呪文で再戦できます）
        </p>
      )}

      <form onSubmit={castSpell} className="flex gap-2">
        <input
          value={spell}
          onChange={(e) => setSpell(e.target.value)}
          disabled={!active}
          placeholder="呪文（追加指示）を入力…"
          className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!active}
          className="rounded bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          詠唱
        </button>
      </form>
    </article>
  )
}
