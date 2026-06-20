/* eslint-disable no-console */
/**
 * スプライトシート切り出しCLI（タスク#117）。
 * 1枚の元画像から、spec(JSON)で「指定した部品（矩形）」を切り出して個別PNGアセットにする。
 *
 * 使い方:
 *   pnpm --filter @github-issue-rpg/web slice-assets <spec.json>
 *   （例: pnpm --filter @github-issue-rpg/web slice-assets scripts/asset-slices.example.json）
 *
 * spec の形式は scripts/asset-slices.example.json と src/assets/slicer.ts の SliceSpec を参照。
 * - source: 元画像PNG（spec ファイルからの相対パス）
 * - out:    出力ディレクトリ（public 基準。既定 'assets/sliced'）
 * - slices: [{ key, x, y, w, h }, ...]
 *
 * 出力は packages/web/public/<out>/<key>.png。manifest.ts の file をこのパスに向けると組み込まれる。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { cropRgba, validateSlices, type SliceSpec } from '../src/assets/slicer.ts'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(scriptDir, '../public')

function fail(message: string): never {
  console.error(`[slice-assets] ${message}`)
  process.exit(1)
}

const specArg = process.argv[2]
if (!specArg) {
  fail('使い方: slice-assets <spec.json>')
}

const specPath = resolve(process.cwd(), specArg)
let spec: SliceSpec
try {
  spec = JSON.parse(readFileSync(specPath, 'utf8')) as SliceSpec
} catch (error) {
  fail(`spec を読めません: ${specPath}\n${error instanceof Error ? error.message : String(error)}`)
}

if (!spec.source || !Array.isArray(spec.slices) || spec.slices.length === 0) {
  fail('spec には source と1件以上の slices が必要です')
}

const sourcePath = resolve(dirname(specPath), spec.source)
let png: PNG
try {
  png = PNG.sync.read(readFileSync(sourcePath))
} catch (error) {
  fail(
    `元画像を読めません: ${sourcePath}\n${error instanceof Error ? error.message : String(error)}`,
  )
}

const src = { data: new Uint8Array(png.data), width: png.width, height: png.height }
console.log(`[slice-assets] 元画像: ${spec.source} (${src.width}x${src.height})`)

const errors = validateSlices(spec.slices, src.width, src.height, spec.tile)
if (errors.length > 0) {
  fail(`切り出し領域の検証に失敗しました:\n - ${errors.join('\n - ')}`)
}

const outDir = spec.out ?? 'assets/sliced'
for (const slice of spec.slices) {
  const cropped = cropRgba(src, slice)
  const outPng = new PNG({ width: cropped.width, height: cropped.height })
  outPng.data = Buffer.from(cropped.data)
  const relPath = join(outDir, `${slice.key}.png`)
  const outPath = join(publicDir, relPath)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, PNG.sync.write(outPng))
  console.log(`[slice-assets] 出力: ${relPath} (${cropped.width}x${cropped.height})`)
}

console.log(
  `[slice-assets] 完了: ${spec.slices.length} 件。` +
    `manifest.ts の各 file を "${outDir}/<key>.png" に向け、placeholder:false にすると組み込まれます。`,
)
