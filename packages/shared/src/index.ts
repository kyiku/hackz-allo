/**
 * @github-issue-rpg/shared
 *
 * World/Enemy/Battle/Reward/Player/WSイベント等のドメイン型を集約するパッケージ。
 * 型はzodスキーマから推論し、ランタイム検証も提供する。
 */

export const SHARED_PACKAGE_NAME = '@github-issue-rpg/shared'

export * from './domain/world'
export * from './domain/enemy'
export * from './domain/battle'
export * from './domain/reward'
export * from './domain/player'
export * from './events/server-events'
export * from './events/client-events'
export * from './events/ws-events'
