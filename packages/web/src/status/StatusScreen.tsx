import {
  MAX_PARTY_SIZE,
  agentEffortSchema,
  type AgentEffort,
  type Assignment,
  type Equipment,
  type Loadout,
  type LoadoutTuning,
  type Player,
} from '@github-issue-rpg/shared'
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { abilityLabel, isEquipped } from './presentation'

interface StatusScreenProps {
  player: Player | null
  loadout: Loadout | null
  equipment: Equipment[]
  assignments: Assignment[]
  /** 装備の付け替え（cmd.loadout.equip）。 */
  onEquip: (equipmentId: number, equipped: boolean) => void
  /** AIチューニング（cmd.loadout.tune）。 */
  onTune: (tuning: LoadoutTuning) => void
}

const EFFORTS: AgentEffort[] = ['low', 'medium', 'high']

/**
 * ステータス/編成画面（タスク10.7 / design.md §8.10）。
 * プレイヤー状態の閲覧、装備の付け替え、AIチューニング、アサインissue一覧、パーティ表示。
 */
export function StatusScreen({
  player,
  loadout,
  equipment,
  assignments,
  onEquip,
  onTune,
}: StatusScreenProps) {
  const [effort, setEffort] = useState<AgentEffort>('medium')
  const [partySize, setPartySize] = useState<number>(loadout?.partySize ?? 1)

  // サーバー由来の partySize に追従する（useState 初期値は再評価されないため）。
  useEffect(() => {
    if (loadout?.partySize != null) setPartySize(loadout.partySize)
  }, [loadout?.partySize])

  function clampPartySize(value: number): number {
    return Math.min(MAX_PARTY_SIZE, Math.max(1, Math.trunc(value) || 1))
  }

  function selectEffort(value: string): void {
    // 任意文字列の混入を防ぎ、許容値のみ採用する（as キャストで黙らせない）。
    const parsed = agentEffortSchema.safeParse(value)
    if (parsed.success) setEffort(parsed.data)
  }

  function applyTuning() {
    onTune({ effort, partySize: clampPartySize(partySize) })
  }

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <section>
        <h3 className="mb-1 text-base font-semibold text-slate-200">ステータス</h3>
        {player ? (
          <p className="text-sm text-slate-300">
            Lv {player.level}・EXP {player.exp}・パーティ {loadout?.partySize ?? 1}体
          </p>
        ) : (
          <p className="text-sm text-slate-500">プレイヤー情報は未取得です。</p>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-slate-200">
          装備（武器コレクション {equipment.length}）
        </h3>
        {equipment.length === 0 ? (
          <p className="text-sm text-slate-500">まだ装備はありません。敵を撃破して入手します。</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {equipment.map((item) => {
              const equipped = isEquipped(item.id, loadout)
              const ability = abilityLabel(item)
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded bg-slate-900/60 px-3 py-1.5"
                >
                  <span className="text-sm text-slate-200">
                    {item.name}
                    <span className="ml-1 text-xs text-slate-400">[{item.kind}]</span>
                    {ability && (
                      <span className="ml-1 text-xs text-emerald-400">能力: {ability}</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => onEquip(item.id, !equipped)}
                    className={`rounded px-3 py-1 text-xs font-semibold text-white ${
                      equipped ? 'bg-slate-600' : 'bg-emerald-600'
                    }`}
                  >
                    {equipped ? '外す' : '装備'}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-slate-200">AIチューニング</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor="tune-effort" className="flex flex-col gap-1 text-xs text-slate-300">
            努力度(effort)
            <select
              id="tune-effort"
              value={effort}
              onChange={(event) => selectEffort(event.target.value)}
              className="rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            >
              {EFFORTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="tune-party" className="flex flex-col gap-1 text-xs text-slate-300">
            パーティ規模
            <input
              id="tune-party"
              type="number"
              min={1}
              max={MAX_PARTY_SIZE}
              value={partySize}
              onChange={(event) => setPartySize(clampPartySize(Number(event.target.value)))}
              className="w-20 rounded border border-slate-600 bg-slate-900 px-2 py-1 text-sm text-slate-100"
            />
          </label>
          <button
            type="button"
            onClick={applyTuning}
            className="rounded bg-violet-600 px-4 py-1.5 text-sm font-semibold text-white"
          >
            反映する
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-base font-semibold text-slate-200">
          アサインissue（{assignments.length}）
        </h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">アサイン中のissueはありません。</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {assignments.map((assignment) => (
              <li key={assignment.issueNumber} className="text-sm text-slate-300">
                #{assignment.issueNumber}・{assignment.status}
                {assignment.battleId ? `（戦闘中: ${assignment.battleId}）` : '（未着手）'}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  )
}

/** ストア接続版。App から差し込む。 */
export function ConnectedStatusScreen() {
  const player = useGameStore((s) => s.player)
  const loadout = useGameStore((s) => s.loadout)
  const equipment = useGameStore((s) => s.equipment)
  const assignments = useGameStore((s) => s.assignments)
  const send = useGameStore((s) => s.send)
  return (
    <StatusScreen
      player={player}
      loadout={loadout}
      equipment={equipment}
      assignments={assignments}
      onEquip={(equipmentId, equipped) =>
        send({ type: 'cmd.loadout.equip', equipmentId, equipped })
      }
      onTune={(tuning) => send({ type: 'cmd.loadout.tune', tuning })}
    />
  )
}
