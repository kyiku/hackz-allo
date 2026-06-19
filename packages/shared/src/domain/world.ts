import { z } from 'zod'

/** リポジトリ参照。owner/name はGitHub API、url は接続入力に対応する。 */
export const repoRefSchema = z.object({
  owner: z.string(),
  name: z.string(),
  url: z.string().url(),
})
export type RepoRef = z.infer<typeof repoRefSchema>

/** 1 リポジトリ = 1 ワールド。 */
export const worldSchema = z.object({
  id: z.number().int(),
  repoOwner: z.string(),
  repoName: z.string(),
  repoUrl: z.string().url(),
  createdAt: z.string(),
})
export type World = z.infer<typeof worldSchema>
