import { z } from 'zod'

/**
 * 酒場で生成する issue 案（タイトル/本文/ラベル）。
 * 確定登録すると GitHub に issue として登録され、ワールドに敵として反映される。
 */
export const issueDraftSchema = z.object({
  title: z.string().min(1),
  body: z.string(),
  labels: z.array(z.string()),
})
export type IssueDraft = z.infer<typeof issueDraftSchema>
