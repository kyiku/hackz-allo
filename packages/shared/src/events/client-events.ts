import { z } from 'zod'

/**
 * クライアント→サーバー(C→S)のWSイベント。
 * requirements.md §6 イベント表に準拠する。
 */
export const clientEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('spell.cast'), battleId: z.string(), message: z.string() }),
  z.object({ type: z.literal('cmd.forge'), issueNumber: z.number().int() }),
  z.object({ type: z.literal('cmd.stop'), battleId: z.string() }),
  z.object({ type: z.literal('cmd.tavern'), message: z.string() }),
  z.object({ type: z.literal('cmd.connect'), repoUrl: z.string().url() }),
])
export type ClientEvent = z.infer<typeof clientEventSchema>
