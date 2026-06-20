import { isAbsolute, normalize, resolve } from 'node:path'

/**
 * ForgeAgent のコマンド実行制限（要件6.1）。
 * `canUseTool` 用の判定ロジックを純粋関数として提供する。
 * `allowedTools` は自動承認用であり制限ではないため、本判定で明示的に拒否する。
 */

const DESTRUCTIVE_PATTERNS: RegExp[] = [
  /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i, // rm -rf / -fr
  /\bsudo\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /:\(\)\s*\{/, // フォーク爆弾
  /\b(curl|wget)\b[^\n|]*\|\s*(sh|bash)\b/i, // パイプ実行
  /\bgit\s+push\b[^\n]*--force/i, // 強制push
  /\bgit\s+push\b[^\n]*\bmain\b/i, // main直push
  /\bnpm\s+publish\b/i,
  />\s*\/dev\/(sd|nvme|disk)/i,
  /\bchmod\s+-R?\s*777\s+\//i,
]

/** 破壊的コマンドかどうかを判定する。 */
export function isDestructiveCommand(command: string): boolean {
  return DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(command))
}

/** path が root 配下に収まるか（パストラバーサル防止）。 */
export function isPathWithin(path: string, root: string): boolean {
  if (!isAbsolute(path)) {
    return true // 相対パスは cwd(=worktree) 基準のため許容
  }
  const normalizedRoot = resolve(root)
  const normalizedPath = normalize(resolve(path))
  return normalizedPath === normalizedRoot || normalizedPath.startsWith(`${normalizedRoot}/`)
}

function isPackageJson(filePath: string): boolean {
  return /(^|\/)package\.json$/.test(filePath)
}

export interface ToolUseInput {
  command?: string
  file_path?: string
  content?: string
  old_string?: string
  new_string?: string
}

export interface EvaluateToolUseParams {
  toolName: string
  input: ToolUseInput
  worktreePath: string
}

export interface ToolUseDecision {
  allowed: boolean
  reason?: string
}

/** ツール使用の可否を判定する。 */
export function evaluateToolUse({ toolName, input, worktreePath }: EvaluateToolUseParams): ToolUseDecision {
  if (toolName === 'Bash') {
    const command = input.command ?? ''
    if (isDestructiveCommand(command)) {
      return { allowed: false, reason: `破壊的コマンドを拒否しました: ${command}` }
    }
    return { allowed: true }
  }

  if (toolName === 'Write' || toolName === 'Edit') {
    const filePath = input.file_path ?? ''
    if (!isPathWithin(filePath, worktreePath)) {
      return { allowed: false, reason: `作業ディレクトリ外への書き込みを拒否しました: ${filePath}` }
    }
    if (isPackageJson(filePath)) {
      const changed = `${input.content ?? ''}${input.old_string ?? ''}${input.new_string ?? ''}`
      if (changed.includes('scripts')) {
        return { allowed: false, reason: 'package.json の scripts 改変を拒否しました。' }
      }
    }
    return { allowed: true }
  }

  return { allowed: true }
}

/** Claude Agent SDK の canUseTool 結果（サブセット）。 */
export type CanUseToolResult =
  | { behavior: 'allow'; updatedInput: ToolUseInput }
  | { behavior: 'deny'; message: string }

export type CanUseTool = (toolName: string, input: ToolUseInput) => Promise<CanUseToolResult>

/**
 * worktree に紐づく canUseTool コールバックを生成する。
 * `query()` の options.canUseTool に渡してコマンド/パスを検査する。
 */
export function buildCanUseTool(worktreePath: string): CanUseTool {
  return async (toolName, input) => {
    const decision = evaluateToolUse({ toolName, input, worktreePath })
    if (decision.allowed) {
      return { behavior: 'allow', updatedInput: input }
    }
    return { behavior: 'deny', message: decision.reason ?? 'ツール使用が拒否されました。' }
  }
}
