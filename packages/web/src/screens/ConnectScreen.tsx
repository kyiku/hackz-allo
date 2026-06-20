import type { Enemy, ServerEvent } from '@github-issue-rpg/shared'
import { ConnectedRepoConnectPanel } from '../connect/RepoConnectPanel'
import { useGameStore, type ConnectionStatus } from '../store/gameStore'

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

/** DEV専用: バックエンド/Runner無しでもワールドUIを確認するためのダミーワールド。 */
function demoWorldEvent(): ServerEvent {
  const mk = (id: number, issueNumber: number, difficulty: Enemy['difficulty']): Enemy => ({
    id,
    worldId: 1,
    issueNumber,
    title: `デモissue #${issueNumber}`,
    hpTotal: 3,
    hpCurrent: 3,
    difficulty,
    weakness: null,
    status: 'active',
  })
  return {
    type: 'world.state',
    world: {
      id: 1,
      repoOwner: 'demo',
      repoName: 'world',
      repoUrl: 'https://github.com/demo/world',
      createdAt: '2026-06-20T00:00:00.000Z',
    },
    enemies: [mk(1, 11, 'easy'), mk(2, 42, 'normal'), mk(3, 77, 'hard'), mk(4, 103, 'boss')],
  }
}

interface ConnectScreenProps {
  /** タイトルへ戻る。 */
  onBack: () => void
}

/**
 * リポジトリ選択画面（タスク#117拡張）。
 * URLでリポジトリに接続し、`world.state` を受信するとAppがワールド画面へ遷移する。
 */
export function ConnectScreen({ onBack }: ConnectScreenProps) {
  const connection = useGameStore((s) => s.connection)

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-gradient-to-b from-rpg-bg to-[#0a0f1e] p-6 text-rpg-ink">
      <div className="w-full max-w-lg">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="font-pixel text-sm text-rpg-muted hover:text-rpg-ink"
          >
            ← タイトルへ
          </button>
          <span className="flex items-center gap-2 font-pixel text-sm text-rpg-muted">
            <span className={`h-2.5 w-2.5 rounded-full ${CONNECTION_COLOR[connection]}`} />
            {CONNECTION_LABEL[connection]}
          </span>
        </div>

        <h1 className="mb-1 text-2xl text-rpg-ink">リポジトリを選択</h1>
        <p className="mb-4 text-sm text-rpg-muted">
          GitHub リポジトリのURLを入力して接続すると、ワールドに参加します。
        </p>

        <ConnectedRepoConnectPanel />

        {/* 操作方法（旧・ワールド下部バーから移設） */}
        <div className="rpg-window mt-6 p-4">
          <p className="rpg-label mb-3 text-sm">操作方法</p>
          <ul className="flex flex-col gap-2 text-sm text-rpg-ink">
            <li className="flex items-center gap-2">
              <span className="flex gap-1">
                <kbd className="rpg-panel px-1.5 py-0.5 font-pixel text-xs">↑↓←→</kbd>
                <kbd className="rpg-panel px-1.5 py-0.5 font-pixel text-xs">WASD</kbd>
              </span>
              で移動
            </li>
            <li className="flex flex-wrap items-center gap-2">
              NPC（敵・鍛冶屋・酒場・賢者）に隣接して
              <kbd className="rpg-panel px-1.5 py-0.5 font-pixel text-xs">Space</kbd>
              <kbd className="rpg-panel px-1.5 py-0.5 font-pixel text-xs">Enter</kbd>
              で話しかける
            </li>
          </ul>
        </div>

        {import.meta.env.DEV && (
          <button
            type="button"
            onClick={() => useGameStore.getState().ingest(demoWorldEvent())}
            className="mt-4 w-full rounded border-2 border-dashed border-rpg-frame/60 px-4 py-2 font-pixel text-sm text-rpg-muted hover:border-rpg-gold/60 hover:text-rpg-ink"
          >
            デモワールドで入る（開発用・バックエンド不要）
          </button>
        )}
      </div>
    </div>
  )
}
