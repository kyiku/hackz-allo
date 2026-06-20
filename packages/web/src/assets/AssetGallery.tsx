import { useState } from 'react'
import { ALL_ASSETS, assetUrl, type AssetEntry } from './manifest'

/** 1アセットのサムネイル。ロード失敗時は壊れアイコンの代わりに代替表示する。 */
function AssetThumb({ entry, base }: { entry: AssetEntry; base: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <figure className="flex w-28 flex-col items-center gap-1 rounded border border-slate-700 bg-slate-800/60 p-2">
      {failed ? (
        <div className="flex h-12 w-full items-center justify-center text-[10px] text-slate-500">
          画像なし
        </div>
      ) : (
        <img
          src={assetUrl(entry.key, base)}
          alt={entry.label}
          className="h-12 w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
      <figcaption className="text-center text-xs text-slate-300">
        {entry.label}
        {entry.placeholder && <span className="block text-[10px] text-slate-500">仮素材</span>}
      </figcaption>
    </figure>
  )
}

/**
 * アセットギャラリー（タスク10.6）。
 * マニフェスト経由で全アセットを読み込み表示し、「組み込み」が機能していることを確認する。
 * 実体はプレースホルダSVG。本番AI生成PNGに差し替えても本コンポーネントは無変更で動く。
 * 確認用のデバッグUIのため、本番ビルドでは App 側で非表示にする。
 */
export function AssetGallery() {
  const base = import.meta.env.BASE_URL

  return (
    <div className="flex flex-wrap gap-3">
      {ALL_ASSETS.map((entry) => (
        <AssetThumb key={entry.key} entry={entry} base={base} />
      ))}
    </div>
  )
}
