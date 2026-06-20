/**
 * リポジトリURLの軽量バリデーション（タスク10.8）。
 * 送信前に明らかに不正なURLを弾く（cmd.connect の repoUrl は zod の url() 検証もある）。
 */

/** パスセグメント配列を返す（各セグメント末尾の `.git` と空要素を除去）。 */
function repoSegments(pathname: string): string[] {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => segment.replace(/\.git$/, ''))
}

/** https:// で始まる正しいURL形式かつホストが github.com で、ちょうど owner/repo か。 */
export function isLikelyRepoUrl(input: string): boolean {
  let url: URL
  try {
    url = new URL(input.trim())
  } catch {
    return false
  }
  if (url.protocol !== 'https:') return false
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return false
  // owner/repo ちょうど2セグメント。/owner/repo/tree/main のような深いパスは弾く。
  return repoSegments(url.pathname).length === 2
}

/**
 * owner/repo 形式へ正規化する（`.git`・末尾スラッシュ除去）。
 * 最終的に `new URL()` を通して妥当性を再確認し、不正なら例外を投げる。
 */
export function normalizeRepoUrl(input: string): string {
  const url = new URL(input.trim())
  const [owner, repo] = repoSegments(url.pathname)
  if (!owner || !repo) {
    throw new Error(`リポジトリURLが owner/repo 形式ではありません: ${input}`)
  }
  return `${url.protocol}//${url.hostname}/${owner}/${repo}`
}
