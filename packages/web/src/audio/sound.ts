/**
 * 効果音・BGMの管理（タスク#117拡張）。
 * 素材は Kenney（CC0）。表示・演出専用で、ゲームロジックには関与しない。
 *
 * - SFX は短い ogg を多重再生（クリック/決定/開閉/戦闘/勝利/エラー）。
 * - BGM はループ再生（任意。ファイルが無ければ無音のまま）。
 * - ミュート状態は localStorage に保存。autoplay 規制のためユーザー操作後に解禁される。
 */

const base = import.meta.env.BASE_URL

/** SFX 種別→ファイル。 */
const SFX_FILES = {
  select: 'select.ogg',
  open: 'open.ogg',
  close: 'close.ogg',
  battle: 'battle.ogg',
  victory: 'victory.ogg',
  error: 'error.ogg',
} as const

export type SfxName = keyof typeof SFX_FILES

const MUTE_KEY = 'girpg.muted'

function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

class AudioManager {
  private muted = loadMuted()
  private readonly buffers = new Map<SfxName, HTMLAudioElement>()
  private bgm: HTMLAudioElement | null = null
  private bgmSrc: string | null = null
  private readonly listeners = new Set<(muted: boolean) => void>()

  /** SFX をプリロードして遅延を減らす。 */
  preloadSfx(): void {
    for (const name of Object.keys(SFX_FILES) as SfxName[]) {
      if (this.buffers.has(name)) continue
      const audio = new Audio(`${base}assets/audio/sfx/${SFX_FILES[name]}`)
      audio.preload = 'auto'
      audio.volume = 0.5
      this.buffers.set(name, audio)
    }
  }

  /** SFX を鳴らす（多重再生のため複製を再生）。 */
  playSfx(name: SfxName): void {
    if (this.muted) return
    const tpl = this.buffers.get(name)
    const src = tpl ? tpl.src : `${base}assets/audio/sfx/${SFX_FILES[name]}`
    const audio = new Audio(src)
    audio.volume = 0.5
    void audio.play().catch(() => {
      // autoplay 規制やデコード失敗は無視（無音にフォールバック）。
    })
  }

  /**
   * BGM を開始する（ユーザー操作後に呼ぶこと）。
   * `file` は public/assets/audio/bgm/ 配下のファイル名。未配置なら 404 で無音になる。
   */
  startBgm(file: string, volume = 0.35): void {
    const src = `${base}assets/audio/bgm/${file}`
    if (this.bgm && this.bgmSrc === src) {
      if (!this.muted) void this.bgm.play().catch(() => {})
      return
    }
    this.stopBgm()
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = volume
    this.bgm = audio
    this.bgmSrc = src
    if (!this.muted) void audio.play().catch(() => {})
  }

  stopBgm(): void {
    if (this.bgm) {
      this.bgm.pause()
      this.bgm.currentTime = 0
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
    } catch {
      // 保存不可でも致命ではない。
    }
    if (this.bgm) {
      if (muted) this.bgm.pause()
      else void this.bgm.play().catch(() => {})
    }
    for (const fn of this.listeners) fn(muted)
  }

  toggleMuted(): void {
    this.setMuted(!this.muted)
  }

  /** ミュート状態の変化を購読する（UIの同期用）。 */
  subscribe(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
}

/** アプリ全体で共有する音声マネージャ。 */
export const sound = new AudioManager()
