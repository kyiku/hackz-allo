import type { BattleLogKind } from '@github-issue-rpg/shared'

/**
 * ForgeAgent(Claude Agent SDK)のメッセージを RPG風戦闘ログへ変換する（要件5.4, 6.2）。
 * tool_use / text / result を抽象化し、UIに流せる {line, kind} に落とす。
 */
export interface BattleLogLine {
  line: string
  kind: BattleLogKind
}

interface ContentBlock {
  type: string
  text?: string
  name?: string
  input?: { file_path?: string; command?: string }
}

interface SdkMessageLike {
  type: string
  subtype?: string
  message?: { content?: ContentBlock[] }
}

function toolUseToLog(block: ContentBlock): BattleLogLine | null {
  const file = block.input?.file_path
  switch (block.name) {
    case 'Write':
    case 'Edit':
      return { line: `⚔️ ${file ?? 'ファイル'} へ斬撃！`, kind: 'attack' }
    case 'Read':
    case 'Glob':
    case 'Grep':
      return { line: `👁 ${file ?? '対象'} を解析中…`, kind: 'info' }
    case 'Bash':
      return { line: `🔧 コマンド実行: ${block.input?.command ?? ''}`.trimEnd(), kind: 'info' }
    default:
      return { line: `✨ ${block.name ?? 'スキル'} を発動`, kind: 'info' }
  }
}

/** SDKメッセージを0個以上の戦闘ログ行へ変換する。 */
export function messageToBattleLogs(message: SdkMessageLike): BattleLogLine[] {
  if (message.type === 'result') {
    if (message.subtype === 'success') {
      return [{ line: '✨ 開発完了！敵に止めを刺した！', kind: 'system' }]
    }
    return [{ line: '💥 開発が中断された…', kind: 'system' }]
  }

  if (message.type === 'assistant') {
    const blocks = message.message?.content ?? []
    const logs: BattleLogLine[] = []
    for (const block of blocks) {
      if (block.type === 'text') {
        const text = block.text?.trim()
        if (text) {
          logs.push({ line: text, kind: 'info' })
        }
      } else if (block.type === 'tool_use') {
        const log = toolUseToLog(block)
        if (log) {
          logs.push(log)
        }
      }
    }
    return logs
  }

  return []
}
