import type { IssueDraft } from '@github-issue-rpg/shared'
import { useEffect, useState, type FormEvent } from 'react'
import { useGameStore } from '../store/gameStore'

interface TavernPanelProps {
  draft: IssueDraft | null
  /** 会話メッセージ送信（issue案生成の依頼）。 */
  onTalk: (message: string) => void
  /** issue案の確定登録。 */
  onPublish: (draft: IssueDraft) => void
}

/**
 * 酒場UI（タスク10.5）。
 * 会話入力で `cmd.tavern` を送り、返ってきた issue 案（`tavern.issueDraft`）をプレビュー表示、
 * ワンクリックで `cmd.tavern.publish` 登録する。
 */
export function TavernPanel({ draft, onTalk, onPublish }: TavernPanelProps) {
  const [message, setMessage] = useState('')
  const [published, setPublished] = useState(false)

  // 新しい issue 案が届いたら登録済みフラグをリセットする。
  useEffect(() => {
    setPublished(false)
  }, [draft])

  function talk(event: FormEvent) {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return
    onTalk(trimmed)
    setMessage('')
  }

  function publish() {
    if (!draft) return
    onPublish(draft)
    setPublished(true)
  }

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/60 p-4">
      <header className="flex items-center gap-2">
        <span className="text-xl">🍺</span>
        <h3 className="text-base font-semibold text-slate-200">酒場</h3>
      </header>

      <form onSubmit={talk} className="flex gap-2">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="どんな課題を解決したい？（例: ログイン処理が遅い）"
          className="flex-1 rounded border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-100"
        />
        <button
          type="submit"
          className="rounded bg-amber-700 px-4 py-1.5 text-sm font-semibold text-white"
        >
          相談する
        </button>
      </form>

      {draft && (
        <div className="flex flex-col gap-2 rounded border border-slate-600 bg-slate-900/60 p-3">
          <p className="text-sm font-semibold text-slate-100">{draft.title}</p>
          {draft.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {draft.labels.map((label) => (
                <span
                  key={label}
                  className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-200"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
          <p className="whitespace-pre-wrap text-sm text-slate-300">{draft.body}</p>
          {published ? (
            <p className="text-sm text-emerald-400">登録しました。ワールドに敵として出現します。</p>
          ) : (
            <button
              type="button"
              onClick={publish}
              className="self-start rounded bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white"
            >
              このissueを登録する
            </button>
          )}
        </div>
      )}
    </article>
  )
}

/** ストア接続版の酒場UI。App から手軽に差し込めるようにラップする。 */
export function ConnectedTavernPanel() {
  const draft = useGameStore((s) => s.tavernDraft)
  const send = useGameStore((s) => s.send)
  return (
    <TavernPanel
      draft={draft}
      onTalk={(message) => send({ type: 'cmd.tavern', message })}
      onPublish={(value) => send({ type: 'cmd.tavern.publish', draft: value })}
    />
  )
}
