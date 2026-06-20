import { useEffect } from 'react'
import { MapView } from './map/MapView'
import { useGameStore, type ConnectionStatus } from './store/gameStore'
import { createGameSocket } from './ws/client'

const CONNECTION_LABEL: Record<ConnectionStatus, string> = {
  connecting: '接続中…',
  open: '接続済み',
  closed: '切断',
}

const CONNECTION_COLOR: Record<ConnectionStatus, string> = {
  connecting: 'bg-amber-500',
  open: 'bg-emerald-500',
  closed: 'bg-rose-500',
}

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.host}/ws`
}

export function App() {
  const connection = useGameStore((s) => s.connection)
  const world = useGameStore((s) => s.world)
  const enemies = useGameStore((s) => s.enemies)
  const battles = useGameStore((s) => s.battles)
  const send = useGameStore((s) => s.send)

  useEffect(() => {
    const { ingest, setConnection, setSender } = useGameStore.getState()
    const socket = createGameSocket({
      url: wsUrl(),
      onEvent: ingest,
      onStatus: setConnection,
    })
    setSender(socket.send)
    return () => {
      socket.close()
      setSender(() => {})
    }
  }, [])

  const enemyList = Object.values(enemies)
  const battleList = Object.values(battles)

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-900 p-8 text-slate-100">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">GitHub Issue RPG</h1>
        <span className="flex items-center gap-2 text-sm text-slate-300">
          <span className={`h-2.5 w-2.5 rounded-full ${CONNECTION_COLOR[connection]}`} />
          {CONNECTION_LABEL[connection]}
        </span>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-200">ワールド</h2>
        {world ? (
          <p className="mb-3 text-slate-300">
            {world.repoOwner}/{world.repoName}
          </p>
        ) : (
          <p className="mb-3 text-slate-500">未接続（リポジトリ接続UIはタスク10.8で実装する）。</p>
        )}
        <MapView
          enemies={enemyList}
          onEngage={(issueNumber) => send({ type: 'cmd.forge', issueNumber })}
        />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-200">
          敵（issue） {enemyList.length}体
        </h2>
        <ul className="flex flex-col gap-1">
          {enemyList.map((enemy) => (
            <li key={enemy.id} className="text-slate-300">
              #{enemy.issueNumber} {enemy.title}（HP {enemy.hpCurrent}/{enemy.hpTotal}・
              {enemy.difficulty}）
            </li>
          ))}
          {enemyList.length === 0 && <li className="text-slate-500">敵はまだ出現していません。</li>}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-slate-200">戦闘 {battleList.length}件</h2>
        <ul className="flex flex-col gap-1">
          {battleList.map((battle) => (
            <li key={battle.battleId} className="text-slate-300">
              {battle.battleId}: HP {battle.hpCurrent}/{battle.hpTotal}・{battle.status}
            </li>
          ))}
          {battleList.length === 0 && (
            <li className="text-slate-500">進行中の戦闘はありません。</li>
          )}
        </ul>
      </section>
    </main>
  )
}
