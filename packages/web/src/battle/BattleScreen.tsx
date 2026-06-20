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
  const dismissBattle = useGameStore((s) => s.dismissBattle)
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
    <article className="rpg-window flex flex-col gap-3 p-4">
      <header className="flex items-center justify-between gap-2">
        <span className="font-pixel text-sm text-rpg-gold">
          {battle.battleId}・{battleStatusLabel(battle.status)}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => send({ type: 'cmd.stop', battleId })}
            disabled={!active}
            className="rpg-btn rpg-btn-danger px-3 py-1 text-xs"
          >
            緊急停止
          </button>
          <button
            type="button"
            onClick={() => dismissBattle(battleId)}
            aria-label="閉じる"
            title="閉じる"
            className="rpg-btn rpg-btn-ghost px-2 py-1 text-xs"
          >
            ✕
          </button>
        </div>
      </header>

      <div>
        <div className="mb-1 flex justify-between font-pixel text-xs text-rpg-muted">
          <span>HP</span>
          <span>
            {battle.hpCurrent}/{battle.hpTotal}
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded border-2 border-rpg-frame-dark bg-rpg-window-dark shadow-inset-deep">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      <ul className="rpg-panel flex max-h-48 flex-col gap-0.5 overflow-y-auto p-2 text-sm">
        {battle.logs.map((log) => (
          <li key={log.seq} className={logKindClass(log.kind)}>
            {log.line}
          </li>
        ))}
        {battle.logs.length === 0 && <li className="text-rpg-muted">まだログはありません。</li>}
      </ul>

      {battle.status === 'defeated' && battle.reward && (
        <p className="rounded border-2 border-amber-600/40 bg-amber-500/20 px-3 py-2 text-sm text-amber-200">
          報酬獲得: {battle.reward.name}（{battle.reward.description}）
        </p>
      )}
      {battle.status === 'failed' && battle.failureReason && (
        <p className="rounded border-2 border-rose-600/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-200">
          失敗: {battle.failureReason}（呪文で再戦できます）
        </p>
      )}

      <form onSubmit={castSpell} className="flex gap-2">
        <input
          value={spell}
          onChange={(e) => setSpell(e.target.value)}
          disabled={!active}
          placeholder="呪文（追加指示）を入力…"
          className="rpg-input flex-1 disabled:opacity-40"
        />
        <button type="submit" disabled={!active} className="rpg-btn rpg-btn-violet">
          詠唱
        </button>
      </form>
    </article>
  )
}
