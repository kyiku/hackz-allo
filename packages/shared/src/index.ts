/**
 * @github-issue-rpg/shared
 *
 * World/Enemy/Battle/Reward/Player/WSイベント等のドメイン型を集約するパッケージ。
 * 型はzodスキーマから推論し、ランタイム検証も提供する。
 */

export const SHARED_PACKAGE_NAME = '@github-issue-rpg/shared'

export * from './domain/world.js'
export * from './domain/enemy.js'
export * from './domain/battle.js'
export * from './domain/reward.js'
export * from './domain/player.js'
export { applyEffects, clampAssignments } from './domain/loadout-effects.js'
export * from './domain/tavern.js'
export * from './domain/npc.js'
export * from './events/server-events.js'
export * from './events/client-events.js'
export * from './events/ws-events.js'
export * from './catalog/ability-catalog.js'
export { EFFECT_CATALOG, getEffect, type EffectAxis, type EffectCard } from './catalog/effect-catalog.js'
export { MODEL_LADDER, MODEL_TIER_MIN, MODEL_TIER_MAX, modelForTier } from './catalog/model-ladder.js'
