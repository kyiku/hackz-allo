import type { AssetKey } from '../assets/manifest'
import type { LandmarkKind } from '../map/grid'

/**
 * ランドマーク施設（鍛冶屋/酒場/賢者）の店主NPCプロフィール（タスク#117拡張）。
 * 店内ビュー（InteriorScreen）のヘッダ表示に使う。店主の立ち絵は manifest の既存スプライトを流用。
 */
export interface LandmarkProfile {
  /** 施設名（看板）。 */
  place: string
  /** 店主NPCの名前。 */
  name: string
  /** 肩書き。 */
  role: string
  /** 入店時の挨拶。 */
  greeting: string
  /** 店主の立ち絵（manifestキー）。 */
  asset: AssetKey
  /** 見出しの絵文字。 */
  emoji: string
}

/** 鍛冶屋/酒場/賢者の店主プロフィール。 */
export const LANDMARK_PROFILES: Record<LandmarkKind, LandmarkProfile> = {
  blacksmith: {
    place: '鍛冶屋',
    name: 'ガロン',
    role: '鍛冶師',
    greeting: 'よく来たな。どのissueを鍛え直してほしい？',
    asset: 'blacksmith',
    emoji: '🔨',
  },
  tavern: {
    place: '酒場「INN」',
    name: 'リーゼ',
    role: '看板娘',
    greeting: 'いらっしゃい！どんな課題を抱えてるの？一杯やりながら聞かせてよ。',
    asset: 'tavern',
    emoji: '🍺',
  },
  sage: {
    place: '賢者の家',
    name: 'エルドラ',
    role: '賢者',
    greeting: 'おぬしの歩みを見せてもらおう。装備も編成も、ここで整えるがよい。',
    asset: 'sage',
    emoji: '📜',
  },
}
