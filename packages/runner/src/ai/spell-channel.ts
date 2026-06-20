/**
 * 呪文（リアルタイム介入）と緊急停止（要件5.5, 6.1）。
 *
 * ForgeAgent の `query()` にストリーミング入力モードで渡す AsyncIterable を提供し、
 * 戦闘中に受け取った呪文を追加メッセージとして橋渡しする。
 */

/** query() のストリーミング入力に流す SDKユーザーメッセージ（サブセット）。 */
export interface SpellMessage {
  type: 'user'
  message: { role: 'user'; content: string }
}

export interface SpellChannel {
  /** query() の prompt に渡す AsyncIterable。 */
  stream: AsyncIterable<SpellMessage>
  /** 呪文を送信する。 */
  cast(content: string): void
  /** 入力ストリームを終了する。 */
  close(): void
  /** 文字列を SDKメッセージ形式に変換する。 */
  toMessage(content: string): SpellMessage
}

function toMessage(content: string): SpellMessage {
  return { type: 'user', message: { role: 'user', content } }
}

/**
 * 呪文チャネルを生成する。cast でメッセージを積み、stream(AsyncIterable)で逐次配信する。
 */
export function createSpellChannel(): SpellChannel {
  const queue: SpellMessage[] = []
  let closed = false
  let wake: (() => void) | null = null

  const signal = (): void => {
    if (wake) {
      const w = wake
      wake = null
      w()
    }
  }

  async function* generate(): AsyncGenerator<SpellMessage> {
    while (true) {
      while (queue.length > 0) {
        yield queue.shift() as SpellMessage
      }
      if (closed) {
        return
      }
      await new Promise<void>((resolve) => {
        wake = resolve
      })
    }
  }

  return {
    stream: generate(),
    cast(content) {
      queue.push(toMessage(content))
      signal()
    },
    close() {
      closed = true
      signal()
    },
    toMessage,
  }
}

/** 緊急停止: 実行中の Query を即座に中断する。 */
export async function emergencyStop(query: { interrupt: () => Promise<void> }): Promise<void> {
  await query.interrupt()
}

interface SystemInitLike {
  type: string
  subtype?: string
  session_id?: string
}

/**
 * init system メッセージから session_id を取り出す（失敗時の再戦 resume/fork 用）。
 * 該当しないメッセージでは null を返す。
 */
export function extractSessionId(message: SystemInitLike): string | null {
  if (message.type === 'system' && message.subtype === 'init') {
    return message.session_id ?? null
  }
  return null
}
