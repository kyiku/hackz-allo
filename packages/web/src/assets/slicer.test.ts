import { describe, expect, it } from 'vitest'
import { cropRgba, validateSlices, type RgbaImage, type Slice } from './slicer'

/** w×h の RGBA画像を生成。各ピクセルの R に連番(0..)を入れて位置を識別できるようにする。 */
function makeImage(width: number, height: number): RgbaImage {
  const data = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = i % 256 // R = ピクセル連番
    data[i * 4 + 1] = 0
    data[i * 4 + 2] = 0
    data[i * 4 + 3] = 255 // A = 不透明
  }
  return { data, width, height }
}

describe('cropRgba', () => {
  it('指定矩形を正しく切り出す（サイズと画素値）', () => {
    const src = makeImage(4, 4) // R値: 0..15（行優先）
    const out = cropRgba(src, { x: 1, y: 1, w: 2, h: 2 })
    expect(out.width).toBe(2)
    expect(out.height).toBe(2)
    // (1,1)=5, (2,1)=6, (1,2)=9, (2,2)=10
    expect([out.data[0], out.data[4], out.data[8], out.data[12]]).toEqual([5, 6, 9, 10])
    // アルファは保持
    expect(out.data[3]).toBe(255)
  })

  it('左上角(0,0)からの切り出し', () => {
    const src = makeImage(4, 4)
    const out = cropRgba(src, { x: 0, y: 0, w: 1, h: 1 })
    expect(out.data[0]).toBe(0)
  })

  it('元バッファを破壊しない（非破壊）', () => {
    const src = makeImage(4, 4)
    const before = src.data[20]
    cropRgba(src, { x: 1, y: 1, w: 2, h: 2 })
    expect(src.data[20]).toBe(before)
  })

  it('範囲外の領域は例外を投げる', () => {
    const src = makeImage(4, 4)
    expect(() => cropRgba(src, { x: 3, y: 0, w: 2, h: 1 })).toThrow(/範囲外/)
    expect(() => cropRgba(src, { x: 0, y: 0, w: 0, h: 1 })).toThrow()
    expect(() => cropRgba(src, { x: -1, y: 0, w: 1, h: 1 })).toThrow()
  })
})

describe('validateSlices', () => {
  const slices: Slice[] = [
    { key: 'player', x: 0, y: 0, w: 48, h: 48 },
    { key: 'blacksmith', x: 48, y: 0, w: 48, h: 48 },
  ]

  it('正常な仕様はエラーなし', () => {
    expect(validateSlices(slices, 96, 48, 48)).toEqual([])
  })

  it('はみ出す領域を検出する', () => {
    const errors = validateSlices([{ key: 'x', x: 60, y: 0, w: 48, h: 48 }], 96, 48)
    expect(errors.some((e) => e.includes('はみ出'))).toBe(true)
  })

  it('キー重複を検出する', () => {
    const dup: Slice[] = [
      { key: 'player', x: 0, y: 0, w: 48, h: 48 },
      { key: 'player', x: 48, y: 0, w: 48, h: 48 },
    ]
    expect(validateSlices(dup, 96, 48).some((e) => e.includes('重複'))).toBe(true)
  })

  it('空キー・非正サイズ・負座標を検出する', () => {
    const bad: Slice[] = [
      { key: '', x: 0, y: 0, w: 48, h: 48 },
      { key: 'a', x: 0, y: 0, w: 0, h: 48 },
      { key: 'b', x: -1, y: 0, w: 48, h: 48 },
    ]
    const errors = validateSlices(bad, 96, 48)
    expect(errors.length).toBeGreaterThanOrEqual(3)
  })

  it('tile指定時、倍数でないサイズを検出する', () => {
    const errors = validateSlices([{ key: 'a', x: 0, y: 0, w: 50, h: 48 }], 96, 48, 48)
    expect(errors.some((e) => e.includes('タイル'))).toBe(true)
  })
})
