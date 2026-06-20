import type { Enemy, ServerEvent, World } from '@github-issue-rpg/shared'
import { expect, test } from '@playwright/test'
import { mockGameSocket } from './mock-ws'

const world: World = {
  id: 1,
  repoOwner: 'kyiku',
  repoName: 'hackz-allo',
  repoUrl: 'https://github.com/kyiku/hackz-allo',
  createdAt: '2026-06-20T00:00:00.000Z',
}

const enemy: Enemy = {
  id: 10,
  worldId: 1,
  issueNumber: 42,
  title: 'ログイン不具合',
  hpTotal: 3,
  hpCurrent: 3,
  difficulty: 'normal',
  weakness: null,
  status: 'active',
}

/**
 * 死守コアE2E（タスク12.1）。
 * 実際のWebアプリ（WSクライアント→reducer→描画）をブラウザで駆動し、
 * 「接続→敵(issue)出現→戦闘開始→1pass=HP-1→撃破(報酬)」の観測フローを検証する。
 *
 * 注: 鍛冶屋依頼→PR→CI→auto-merge のバックエンド処理は外部依存(GitHub/CI/Claude API)のため、
 * ここではその結果として配信されるWSイベント列をモックで再現する。
 * バックエンド側の正しさは runner のユニットテスト（CI成功ゲート/auto-merge等）で担保している。
 */
test('接続→敵出現→TDD戦闘→HP減少→撃破まで観測できる', async ({ page }) => {
  const ws = await mockGameSocket(page)
  await page.goto('/')

  // WS接続が確立し「接続済み」になる。
  await expect(page.getByText('接続済み')).toBeVisible()

  // ワールド状態が届き、敵(issue)がマップ/一覧に出現する。
  const worldState: ServerEvent = { type: 'world.state', world, enemies: [enemy] }
  await ws.send(worldState)
  await expect(page.getByText('#42 ログイン不具合', { exact: false })).toBeVisible()

  // 戦闘開始（HP=対象テスト件数）。
  await ws.send({ type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 3 })
  await expect(page.getByText(/b1: HP 3\/3・fighting/)).toBeVisible()

  // 1pass=HP-1 のリアルタイム反映。
  await ws.send({ type: 'battle.hp_changed', battleId: 'b1', hpCurrent: 2 })
  await expect(page.getByText(/b1: HP 2\/3/)).toBeVisible()
  await ws.send({ type: 'battle.hp_changed', battleId: 'b1', hpCurrent: 1 })
  await expect(page.getByText(/b1: HP 1\/3/)).toBeVisible()

  // 全pass→撃破確定（報酬付き）。HP0・defeated に遷移する。
  await ws.send({
    type: 'battle.defeated',
    battleId: 'b1',
    enemyId: 10,
    reward: {
      kind: 'weapon',
      name: '黒曜のリンタ',
      description: 'null安全を授ける',
      abilityId: null,
    },
  })
  await expect(page.getByText(/b1: HP 0\/3・defeated/)).toBeVisible()
})
