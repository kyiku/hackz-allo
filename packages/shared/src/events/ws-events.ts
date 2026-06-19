import { clientEventSchema, type ClientEvent } from './client-events'
import { serverEventSchema, type ServerEvent } from './server-events'

export { clientEventSchema, type ClientEvent } from './client-events'
export { serverEventSchema, type ServerEvent } from './server-events'

/** 全WSイベント（双方向）。 */
export type WSEvent = ServerEvent | ClientEvent

/**
 * サーバー→クライアントイベントを検証してパースする。不正な入力では例外を投げる。
 */
export function parseServerEvent(input: unknown): ServerEvent {
  return serverEventSchema.parse(input)
}

/**
 * クライアント→サーバーイベントを検証してパースする。不正な入力では例外を投げる。
 */
export function parseClientEvent(input: unknown): ClientEvent {
  return clientEventSchema.parse(input)
}
