import { useState, type FormEvent } from 'react'
import { useGameStore } from '../store/gameStore'
import type { ConnectError } from '../store/reducer'
import { isLikelyRepoUrl, normalizeRepoUrl } from './url'

interface RepoConnectPanelProps {
  connected: boolean
  connectError: ConnectError | null
  /** 接続要求（cmd.connect）。 */
  onConnect: (repoUrl: string) => void
}

const REASON_LABEL: Record<ConnectError['reason'], string> = {
  auth: '認証エラー（PATを確認してください）',
  permission: '権限エラー（リポジトリへのアクセス権がありません）',
  notfound: 'リポジトリが見つかりません',
  unknown: '接続に失敗しました',
}

/**
 * リポジトリ接続UI（タスク10.8 / 要件5.1）。
 * URL入力→接続要求（cmd.connect）。認証/権限エラー（connect.error）を通知する。
 * 接続済みのときはフォームを畳み、明示的な「別リポジトリに切替」でのみ再接続できる
 * （接続済みのまま何度も再送できる雑な挙動を防ぐ）。
 */
export function RepoConnectPanel({ connected, connectError, onConnect }: RepoConnectPanelProps) {
  const [url, setUrl] = useState('')
  const [switching, setSwitching] = useState(false)
  const valid = isLikelyRepoUrl(url)

  // 接続済みかつ切替中でなければフォームは出さない。
  const showForm = !connected || switching

  function connect(event: FormEvent) {
    event.preventDefault()
    if (!valid) return
    onConnect(normalizeRepoUrl(url))
    setSwitching(false)
  }

  return (
    <article className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      {connected && !switching && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-emerald-400">接続済み。ワールドを読み込みました。</p>
          <button
            type="button"
            onClick={() => setSwitching(true)}
            className="rounded border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200"
          >
            別リポジトリに切替
          </button>
        </div>
      )}

      {showForm && (
        <form onSubmit={connect} className="flex gap-2">
          <label htmlFor="repo-url" className="sr-only">
            リポジトリURL
          </label>
          <input
            id="repo-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://github.com/owner/repo"
            aria-invalid={url.length > 0 && !valid}
            aria-describedby={connectError ? 'connect-error' : undefined}
            className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
          />
          <button
            type="submit"
            disabled={!valid}
            className="rounded bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            接続
          </button>
        </form>
      )}

      {showForm && url.length > 0 && !valid && (
        <p className="text-xs text-amber-400">
          github.com の owner/repo 形式のURLを入力してください。
        </p>
      )}
      {connectError && (
        <p id="connect-error" className="rounded bg-rose-500/20 px-3 py-2 text-sm text-rose-200">
          {REASON_LABEL[connectError.reason]}：{connectError.message}
        </p>
      )}
    </article>
  )
}

/** ストア接続版。App から差し込む。 */
export function ConnectedRepoConnectPanel() {
  // 接続済みかの真偽だけが必要なので world オブジェクト全体は購読しない（無駄な再描画を避ける）。
  const connected = useGameStore((s) => s.world !== null)
  const connectError = useGameStore((s) => s.connectError)
  const send = useGameStore((s) => s.send)
  return (
    <RepoConnectPanel
      connected={connected}
      connectError={connectError}
      onConnect={(repoUrl) => send({ type: 'cmd.connect', repoUrl })}
    />
  )
}
