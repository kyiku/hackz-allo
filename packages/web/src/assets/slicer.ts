/**
 * スプライトシート切り出し（タスク#117の基盤）。
 * 1枚の元画像から「指定した矩形領域（部品）」を切り出して個別アセット化するための純粋ロジック。
 *
 * ここはPNG入出力を持たない純関数のみ（RGBAバッファ操作）で、単体テスト可能。
 * 実ファイルの読み書きは CLI（`scripts/slice-assets.ts`）が担当し、本モジュールを利用する。
 */

/** RGBA画像バッファ。1px = 4byte（R,G,B,A）で `data.length === width * height * 4`。 */
export interface RgbaImage {
  data: Uint8Array
  width: number
  height: number
}

/** 元画像から切り出す1部品（矩形領域＋出力キー）。座標・サイズはpx。 */
export interface Slice {
  /** 出力アセットのキー（出力ファイル名に使う。例: 'player'）。 */
  key: string
  x: number
  y: number
  w: number
  h: number
}

/** 切り出し仕様（CLIが読むJSONの形）。 */
export interface SliceSpec {
  /** 元画像パス（CLIが spec ファイルからの相対で解決する）。 */
  source: string
  /** 出力先ディレクトリ（publicDir基準。既定 'assets/sliced'）。 */
  out?: string
  /** タイルサイズ（任意）。指定時は各領域が倍数か検証する。 */
  tile?: number
  slices: Slice[]
}

function isNonNegativeInt(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

/**
 * 切り出し領域の妥当性を検証し、問題点メッセージの配列を返す（空配列なら正常）。
 * - キーの空/重複
 * - 座標・サイズが非負整数か、サイズが正か
 * - 画像範囲からはみ出さないか
 * - tile指定時、各領域がタイル倍数か
 */
export function validateSlices(
  slices: readonly Slice[],
  imageWidth: number,
  imageHeight: number,
  tile?: number,
): string[] {
  const errors: string[] = []
  const seen = new Set<string>()

  slices.forEach((slice, index) => {
    const label = slice.key ? `slice '${slice.key}'` : `slice[${index}]`

    if (!slice.key) errors.push(`slice[${index}]: key が空です`)
    else if (seen.has(slice.key)) errors.push(`${label}: key が重複しています`)
    seen.add(slice.key)

    if (!isNonNegativeInt(slice.x) || !isNonNegativeInt(slice.y)) {
      errors.push(`${label}: x/y は非負整数で指定してください (x=${slice.x}, y=${slice.y})`)
    }
    if (!Number.isInteger(slice.w) || !Number.isInteger(slice.h) || slice.w <= 0 || slice.h <= 0) {
      errors.push(`${label}: w/h は正の整数で指定してください (w=${slice.w}, h=${slice.h})`)
    }
    if (slice.x + slice.w > imageWidth || slice.y + slice.h > imageHeight) {
      errors.push(
        `${label}: 領域が画像サイズ(${imageWidth}x${imageHeight})からはみ出します ` +
          `(x=${slice.x}, y=${slice.y}, w=${slice.w}, h=${slice.h})`,
      )
    }
    if (tile && tile > 0) {
      if (slice.w % tile !== 0 || slice.h % tile !== 0) {
        errors.push(`${label}: サイズがタイル(${tile}px)の倍数ではありません`)
      }
    }
  })

  return errors
}

/**
 * RGBAバッファから矩形領域を切り出し、新しいバッファを返す（純粋・非破壊）。
 * 範囲外の領域は例外を投げる（呼び出し前に validateSlices で検証する想定）。
 */
export function cropRgba(
  src: RgbaImage,
  region: { x: number; y: number; w: number; h: number },
): RgbaImage {
  const { x, y, w, h } = region
  if (
    !isNonNegativeInt(x) ||
    !isNonNegativeInt(y) ||
    w <= 0 ||
    h <= 0 ||
    x + w > src.width ||
    y + h > src.height
  ) {
    throw new Error(
      `crop領域が画像範囲外です: region=(${x},${y},${w},${h}) image=${src.width}x${src.height}`,
    )
  }

  const out = new Uint8Array(w * h * 4)
  const rowBytes = w * 4
  for (let row = 0; row < h; row++) {
    const srcStart = ((y + row) * src.width + x) * 4
    out.set(src.data.subarray(srcStart, srcStart + rowBytes), row * rowBytes)
  }
  return { data: out, width: w, height: h }
}
