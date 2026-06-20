# 切り出し元素材のクレジット

| ファイル | 出典 | ライセンス |
|---|---|---|
| `kenney-rpg-pack.png` | Kenney「RPG Pack」 https://kenney.nl/assets/rpg-pack | **CC0 1.0**（パブリックドメイン・クレジット不要・再配布可） |
| `kenney-tinydungeon.png` | Kenney「Tiny Dungeon」 https://kenney.nl/assets/tiny-dungeon （DL: https://opengameart.org/content/tiny-dungeon ） | **CC0 1.0**（パブリックドメイン・クレジット不要・再配布可） |

CC0のためクレジットは不要だが、出所を明示しておく。RPGツクールのRTP標準素材はエンジン外利用がEULA違反のため使用しない（issue #117 参照）。

## 各アセットの対応（manifestキー → 元シート）
- 地面/背景は RPG Pack（64px）、キャラ・敵は Tiny Dungeon（16px）。
- `scripts/asset-slices.rpgpack.json` … town-bg / ground-grass
- `scripts/asset-slices.tinydungeon.json` … player / sage / blacksmith / tavern / enemy-easy|normal|hard|boss
- 再生成: `pnpm --filter @github-issue-rpg/web slice-assets <spec.json>`
