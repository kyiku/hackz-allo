import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { sound } from '../audio/sound'
import { assetUrl, enemyAssetKey } from '../assets/manifest'
import { enemyName } from '../npc/enemyName'
import { useGameStore } from '../store/gameStore'
import { battleStatusLabel, hpRatio, isBattleActive, logKindClass } from './presentation'

interface BattleViewProps {
  /** 表示対象の戦闘ID（複数同時はタブで切替）。 */
  battleIds: string[]
  /** マップへ戻る。 */
  onClose: () => void
}

/**
 * 全画面の戦闘ビュー（タスク#117拡張）。
 * 敵スプライト＋HP＋RPG風ログ＋呪文詠唱＋緊急停止を一画面に集約し、複数同時戦闘はタブで切替える。
 * 送信イベント（spell.cast / cmd.stop）は従来どおりで、表示の作り込みのみ。
 */
export function BattleView({ battleIds, onClose }: BattleViewProps) {
  const battles = useGameStore((s) => s.battles)
  const enemies = useGameStore((s) => s.enemies)
  const send = useGameStore((s) => s.send)
  const [activeId, setActiveId] = useState(battleIds[0] ?? '')
  const [spell, setSpell] = useState('')
  const reduceMotion = useReducedMotion()

  // 新しい戦闘が始まったらそれをアクティブにする。
  const idsKey = battleIds.join('|')
  const prevIds = useRef<string[]>([])
  useEffect(() => {
    const fresh = battleIds.find((id) => !prevIds.current.includes(id))
    if (fresh) setActiveId(fresh)
    prevIds.current = battleIds
    // idsKey（=battleIds.join）を依存にして配列の中身変化を検知する。
  }, [idsKey])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // 撃破した瞬間に勝利SE（同じ戦闘では一度だけ）。
  const celebrated = useRef<Set<string>>(new Set())
  useEffect(() => {
    for (const id of battleIds) {
      const b = battles[id]
      if (b && b.status === 'defeated' && !celebrated.current.has(id)) {
        celebrated.current.add(id)
        sound.playSfx('victory')
      }
    }
  }, [battles, battleIds])

  const active = battles[activeId] ?? (battleIds[0] ? battles[battleIds[0]] : undefined)
  if (!active) return null

  const enemy = enemies[active.enemyId]
  const ratio = hpRatio(active.hpCurrent, active.hpTotal)
  const fighting = isBattleActive(active.status)
  const title = enemy ? enemyName(enemy.difficulty, enemy.issueNumber) : active.battleId

  function cast(event: FormEvent) {
    event.preventDefault()
    const message = spell.trim()
    if (!message || !active) return
    send({ type: 'spell.cast', battleId: active.battleId, message })
    setSpell('')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-slate-950 via-[#1b1430] to-slate-950 text-rpg-ink"
      role="dialog"
      aria-modal="true"
      aria-label={`戦闘 — ${title}`}
    >
      {/* 戦闘開始フラッシュ（一度だけ） */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 bg-white"
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        />
      )}

      {/* 上部バー */}
      <div className="flex items-center justify-between border-b-2 border-rpg-frame-dark bg-black/40 px-5 py-3 backdrop-blur-sm">
        <h2 className="flex items-center gap-2 text-lg text-rpg-gold">
          <span aria-hidden>⚔</span> 戦闘
        </h2>
        <button type="button" onClick={onClose} className="rpg-btn rpg-btn-ghost px-3 py-1.5">
          マップに戻る（Esc）
        </button>
      </div>

      {/* タブ（複数同時戦闘時） */}
      {battleIds.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-rpg-frame/30 bg-black/20 px-4 py-2">
          {battleIds.map((id) => {
            const b = battles[id]
            if (!b) return null
            const e = enemies[b.enemyId]
            const label = e ? enemyName(e.difficulty, e.issueNumber) : id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveId(id)}
                className={`rpg-btn px-3 py-1 text-xs ${id === active.battleId ? 'rpg-btn-gold' : 'rpg-btn-ghost'}`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* 本体 */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto p-4 sm:p-6">
        <div className="flex w-full max-w-2xl flex-col gap-5">
          {/* 敵ステージ＋HP */}
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
            {enemy && (
              <motion.img
                src={assetUrl(enemyAssetKey(enemy.difficulty))}
                alt={title}
                className="h-24 w-24 shrink-0 rounded-lg bg-black/40 p-1.5"
                style={{ imageRendering: 'pixelated' }}
                animate={fighting ? { y: [0, -6, 0] } : { y: 0 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold">{title}</p>
              <p className="text-xs text-rpg-muted">
                <span>
                  {active.battleId}・{battleStatusLabel(active.status)}
                </span>
                {enemy && <span className="ml-1">#{enemy.issueNumber}</span>}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-pixel text-xs text-rpg-muted">
                  <span>HP</span>
                  <span>
                    {active.hpCurrent}/{active.hpTotal}
                  </span>
                </div>
                <div className="h-5 w-full overflow-hidden rounded border-2 border-rpg-frame-dark bg-rpg-window-dark shadow-inset-deep">
                  <motion.div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    animate={{ width: `${ratio * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {active.status === 'defeated' && (
            <motion.p
              className="rounded-lg border-2 border-rpg-gold/60 bg-rpg-gold/15 py-2 text-center font-pixel text-lg text-rpg-gold"
              initial={reduceMotion ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 16 }}
            >
              ★ 撃破！ ★
            </motion.p>
          )}
          {active.status === 'defeated' && active.reward && (
            <p className="rounded border-2 border-amber-600/40 bg-amber-500/20 px-3 py-2 text-sm text-amber-200">
              報酬獲得: {active.reward.name}（{active.reward.description}）
            </p>
          )}
          {active.status === 'failed' && active.failureReason && (
            <p className="rounded border-2 border-rose-600/40 bg-rose-500/20 px-3 py-2 text-sm text-rose-200">
              失敗: {active.failureReason}（呪文で再戦できます）
            </p>
          )}

          {/* ログ */}
          <ul className="rpg-panel flex max-h-64 flex-col gap-0.5 overflow-y-auto p-3 text-sm">
            {active.logs.map((log) => (
              <li key={log.seq} className={logKindClass(log.kind)}>
                {log.line}
              </li>
            ))}
            {active.logs.length === 0 && <li className="text-rpg-muted">まだログはありません。</li>}
          </ul>

          {/* 呪文詠唱＋緊急停止 */}
          <form onSubmit={cast} className="flex gap-2">
            <input
              value={spell}
              onChange={(e) => setSpell(e.target.value)}
              disabled={!fighting}
              placeholder="呪文（追加指示）を詠唱…"
              className="rpg-input flex-1 disabled:opacity-40"
            />
            <button type="submit" disabled={!fighting} className="rpg-btn rpg-btn-violet">
              詠唱
            </button>
            <button
              type="button"
              onClick={() => send({ type: 'cmd.stop', battleId: active.battleId })}
              disabled={!fighting}
              className="rpg-btn rpg-btn-danger"
            >
              緊急停止
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
