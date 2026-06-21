import {
  MODEL_LADDER,
  agentEffortSchema,
  mcpPool,
  modelForTier,
  type AgentEffort,
  type Assignment,
  type Loadout,
  type LoadoutTuning,
  type Player,
} from '@github-issue-rpg/shared'
import { useEffect, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { toggleMcpRef } from './presentation'

interface StatusScreenProps {
  player: Player | null
  loadout: Loadout | null
  assignments: Assignment[]
  /** MCP割り当ての更新（cmd.loadout.mcp）。選択中の ref 全量を渡す。 */
  onSetMcp: (refs: string[]) => void
  /** AIチューニング（cmd.loadout.tune）。effort/partySize/modelTier を含められる。 */
  onTune: (tuning: LoadoutTuning) => void
}

const EFFORTS: AgentEffort[] = ['low', 'medium', 'high']

/**
 * ステータス/編成画面（賢者の家 / design.md §8.10）。
 * 神経衰弱で得た「枠(容量)」の範囲で MCP/サブエージェント/モデルを配分する。
 */
export function StatusScreen({ player, loadout, assignments, onSetMcp, onTune }: StatusScreenProps) {
  const [effort, setEffort] = useState<AgentEffort>('medium')
  const [partySize, setPartySize] = useState<number>(loadout?.partySize ?? 1)

  // サーバー由来の partySize に追従する（useState 初期値は再評価されないため）。
  useEffect(() => {
    if (loadout?.partySize != null) setPartySize(loadout.partySize)
  }, [loadout?.partySize])

  const mcpSlots = loadout?.mcpSlots ?? 0
  const partySlots = loadout?.partySlots ?? 1
  const modelTierMax = loadout?.modelTierMax ?? 0
  const selectedModelTier = loadout?.selectedModelTier ?? 0
  const enabledMcpRefs = loadout?.enabledMcpRefs ?? []
  const pool = mcpPool()

  function clampPartySize(value: number): number {
    return Math.min(partySlots, Math.max(1, Math.trunc(value) || 1))
  }

  function selectEffort(value: string): void {
    // 任意文字列の混入を防ぎ、許容値のみ採用する（as キャストで黙らせない）。
    const parsed = agentEffortSchema.safeParse(value)
    if (parsed.success) setEffort(parsed.data)
  }

  function applyTuning() {
    onTune({ effort, partySize: clampPartySize(partySize) })
  }

  function toggleMcp(ref: string): void {
    onSetMcp(toggleMcpRef(enabledMcpRefs, ref, mcpSlots))
  }

  function selectModelTier(value: string): void {
    const tier = Math.trunc(Number(value))
    if (!Number.isFinite(tier)) return
    onTune({ modelTier: Math.min(modelTierMax, Math.max(0, tier)) })
  }

  return (
    <article className="rpg-window flex flex-col gap-4 p-4">
      <section>
        <h3 className="rpg-label mb-1 text-base">ステータス</h3>
        {player ? (
          <p className="text-sm text-rpg-ink">
            Lv {player.level}・EXP {player.exp}・パーティ {loadout?.partySize ?? 1}体・モデル{' '}
            {modelForTier(selectedModelTier)}
          </p>
        ) : (
          <p className="text-sm text-rpg-muted">プレイヤー情報は未取得です。</p>
        )}
      </section>

      <section>
        <h3 className="rpg-label mb-1 text-base">
          MCP枠 {enabledMcpRefs.length}/{mcpSlots}
        </h3>
        {pool.length === 0 ? (
          <p className="text-sm text-rpg-muted">割り当て可能なMCPはありません。</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {pool.map((ability) => {
              const checked = enabledMcpRefs.includes(ability.ref)
              const atCapacity = !checked && enabledMcpRefs.length >= mcpSlots
              return (
                <li
                  key={ability.ref}
                  className="rpg-panel flex items-center justify-between gap-2 px-3 py-1.5"
                >
                  <label className="flex items-center gap-2 text-sm text-rpg-ink">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={atCapacity}
                      onChange={() => toggleMcp(ability.ref)}
                      aria-label={ability.displayName}
                    />
                    <span>
                      {ability.displayName}
                      <span className="ml-1 text-xs text-rpg-muted">[{ability.ref}]</span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="rpg-label mb-1 text-base">サブエージェント枠 {partySlots}</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor="party-size" className="flex flex-col gap-1 text-xs text-rpg-ink">
            <span className="rpg-label">パーティ規模</span>
            <input
              id="party-size"
              type="range"
              min={1}
              max={partySlots}
              value={partySize}
              onChange={(event) => setPartySize(clampPartySize(Number(event.target.value)))}
              aria-label="パーティ規模"
            />
          </label>
          <span className="text-sm text-rpg-ink">{partySize}体</span>
        </div>
      </section>

      <section>
        <h3 className="rpg-label mb-1 text-base">
          モデル（解放: {modelForTier(modelTierMax)} まで）
        </h3>
        <label htmlFor="model-tier" className="flex flex-col gap-1 text-xs text-rpg-ink">
          <span className="rpg-label">使用モデル</span>
          <select
            id="model-tier"
            value={selectedModelTier}
            onChange={(event) => selectModelTier(event.target.value)}
            className="rpg-input py-1"
            aria-label="使用モデル"
          >
            {MODEL_LADDER.slice(0, modelTierMax + 1).map((model, tier) => (
              <option key={model} value={tier}>
                {model}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section>
        <h3 className="rpg-label mb-1 text-base">AIチューニング</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label htmlFor="tune-effort" className="flex flex-col gap-1 text-xs text-rpg-ink">
            <span className="rpg-label">努力度(effort)</span>
            <select
              id="tune-effort"
              value={effort}
              onChange={(event) => selectEffort(event.target.value)}
              className="rpg-input py-1"
            >
              {EFFORTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={applyTuning} className="rpg-btn rpg-btn-violet">
            反映する
          </button>
        </div>
      </section>

      <section>
        <h3 className="rpg-label mb-1 text-base">アサインissue（{assignments.length}）</h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-rpg-muted">アサイン中のissueはありません。</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {assignments.map((assignment) => (
              <li key={assignment.issueNumber} className="text-sm text-rpg-ink">
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
  const assignments = useGameStore((s) => s.assignments)
  const send = useGameStore((s) => s.send)
  return (
    <StatusScreen
      player={player}
      loadout={loadout}
      assignments={assignments}
      onSetMcp={(refs) => send({ type: 'cmd.loadout.mcp', refs })}
      onTune={(tuning) => send({ type: 'cmd.loadout.tune', tuning })}
    />
  )
}
