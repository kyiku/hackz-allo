import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { sound } from './audio/sound'
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
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    sound.preloadSfx()
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

  // 表示すべき画面を1つ選び、フェードで切り替える（routing は従来どおり、見た目のみ）。
  const screen = !started ? 'title' : !world ? 'connect' : 'world'
  const node =
    screen === 'title' ? (
      <TitleScreen onStart={() => setStarted(true)} />
    ) : screen === 'connect' ? (
      <ConnectScreen onBack={() => setStarted(false)} />
    ) : (
      <WorldScreen />
    )

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        className="fixed inset-0"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeInOut' }}
      >
        {node}
      </motion.div>
    </AnimatePresence>
  )
}
