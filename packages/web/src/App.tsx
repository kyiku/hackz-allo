import { useEffect, useState } from 'react'
import { ConnectScreen } from './screens/ConnectScreen'
import { TitleScreen } from './screens/TitleScreen'
import { WorldScreen } from './screens/WorldScreen'
import { useGameStore } from './store/gameStore'
import { createGameSocket } from './ws/client'

function wsUrl(): string {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.host}/ws`
}

/**
 * 画面ルーター（タスク#117拡張）。
 * タイトル → リポジトリ選択 → ワールド参加 の遷移を制御する。
 * - 未開始: タイトル
 * - 開始済み・ワールド未取得: リポジトリ選択
 * - ワールド取得済み: ワールド画面
 * BackendへのWS接続はどの画面でも維持する（接続/送信を常に有効化）。
 */
export function App() {
  const world = useGameStore((s) => s.world)
  const [started, setStarted] = useState(false)

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

  if (!started) return <TitleScreen onStart={() => setStarted(true)} />
  if (!world) return <ConnectScreen onBack={() => setStarted(false)} />
  return <WorldScreen />
}
