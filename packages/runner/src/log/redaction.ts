/**
 * 作業ログの秘密情報 redaction（要件6.1）。
 * トークン・環境変数値を除去してから WorkLog に保存する。raw ログは永続化しない。
 */

/** テキストから秘密情報（PAT/APIキー/環境変数値/Bearer）を除去する。 */
export function redactSecrets(text: string): string {
  return (
    text
      // 環境変数（…API_KEY / …TOKEN / …SECRET / …PASSWORD / PAT 系）の値
      .replace(/\b([A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|PAT))\s*=\s*\S+/g, '$1=[REDACTED]')
      // GitHub PAT
      .replace(/\bghp_[A-Za-z0-9]{20,}\b/g, '[REDACTED]')
      .replace(/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[REDACTED]')
      // Anthropic APIキー
      .replace(/\bsk-ant-[A-Za-z0-9._-]{10,}/g, '[REDACTED]')
      // Bearer トークン
      .replace(/\bBearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
  )
}
