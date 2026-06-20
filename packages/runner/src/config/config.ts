import { z } from 'zod'

/**
 * Runner が保持する設定・秘密情報。
 *
 * 秘密情報（PAT / Anthropic APIキー）は Runner プロセス内のみで保持し、
 * Backend / Web には渡さない（要件 5.1, 6.1）。
 *
 * `anthropicApiKey` は任意。Claude Agent SDK（ForgeAgent・構造化生成）を
 * サブスクのログイン認証で動かす場合は不要で、その場合は undefined になる。
 * 値を渡せば従量課金の Anthropic API（生SDK）でも動かせる。
 */
export interface RunnerConfig {
  readonly githubPat: string
  readonly anthropicApiKey: string | undefined
}

const envSchema = z.object({
  GITHUB_PAT: z.string().min(1),
  // 任意。空文字は誤設定として弾くが、未設定は許容する（サブスク認証で動かすため）。
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
})

/** zodのエラーから、問題のある環境変数名を列挙したメッセージを組み立てる。 */
function formatEnvError(error: z.ZodError): string {
  const names = error.issues.map((issue) => issue.path.join('.')).join(', ')
  return `Runner設定の環境変数が不正です: ${names}`
}

/**
 * 環境変数を検証して RunnerConfig を生成する。
 *
 * @param env プロセス環境（テスト容易性のため注入可能。既定は `process.env`）
 * @throws 必須の環境変数が欠落・空の場合
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): RunnerConfig {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    throw new Error(formatEnvError(result.error))
  }
  return {
    githubPat: result.data.GITHUB_PAT,
    anthropicApiKey: result.data.ANTHROPIC_API_KEY,
  }
}
