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

function enemy(overrides: Partial<Enemy> & Pick<Enemy, 'id' | 'issueNumber' | 'title'>): Enemy {
  return {
    worldId: 1,
    hpTotal: 2,
    hpCurrent: 2,
    difficulty: 'normal',
    weakness: null,
    status: 'active',
    ...overrides,
  }
}

const first = enemy({ id: 10, issueNumber: 42, title: '既存のバグ' })
const fromTavern = enemy({ id: 11, issueNumber: 43, title: '酒場で生まれた依頼' })

/**
 * 成長ループ・酒場のE2E（タスク12.3・任意）。
 * 実アプリをブラウザ駆動し、以下の観測フローを検証する:
 *  1) 既存の敵を撃破（報酬獲得）→ 成長ループの起点
 *  2) 酒場で生成・登録した issue が新しい敵としてワールドに反映（enemy.appeared）
 *  3) 新しい敵も戦闘→撃破できる（ループの反復）
 *
 * 注: 酒場の会話→issue案プレビュー（tavern.issueDraft）や装備付け替えUIは別PR（#43/#45）で実装。
 * 本E2Eは現行main UIで観測可能な「撃破」「敵反映」を検証し、UI統合後に操作起点へ拡張できる。
 */
test('撃破→enemy.appearedで新敵反映→再戦撃破のループを観測する', async ({ page }) => {
  const ws = await mockGameSocket(page)
  await page.goto('/')
  // タイトル → リポジトリ選択へ。
  await page.getByRole('button', { name: 'はじめる' }).click()
  await expect(page.getByText('接続済み')).toBeVisible()

  // ワールドに既存の敵が1体（world.state受信でワールド画面へ。マップcanvasのためDOM検証はしない）。
  const worldState: ServerEvent = { type: 'world.state', world, enemies: [first] }
  await ws.send(worldState)

  // 1体目を撃破して報酬を得る（成長ループの起点）。
  // 戦闘画面(BattleScreen)の描画を待ってからHPを動かす（イベント順序に依存させずflakyを避ける）。
  await ws.send({ type: 'battle.started', battleId: 'b1', enemyId: 10, hpTotal: 2 })
  await expect(page.getByText('b1・戦闘中')).toBeVisible()
  // 減少値 "1/2" は b1 の戦闘画面のみに現れ一意。
  await ws.send({ type: 'battle.hp_changed', battleId: 'b1', hpCurrent: 1 })
  await expect(page.getByText('1/2')).toBeVisible()
  await ws.send({
    type: 'battle.defeated',
    battleId: 'b1',
    enemyId: 10,
    reward: { kind: 'skill', name: '熟練の証', description: 'EXPを得た', abilityId: null },
  })
  await expect(page.getByText('b1・撃破')).toBeVisible()
  await expect(page.getByText(/報酬獲得: 熟練の証/)).toBeVisible()

  // 酒場で登録した新issueが敵としてワールドに反映される（マップcanvasに追加）。
  await ws.send({ type: 'enemy.appeared', enemy: fromTavern })

  // 新しい敵も戦闘→撃破できる（ループの反復）。
  await ws.send({ type: 'battle.started', battleId: 'b2', enemyId: 11, hpTotal: 2 })
  await expect(page.getByText('b2・戦闘中')).toBeVisible()
  // この時点で b1 は 0/2 のため "1/2" は b2 の戦闘画面のみに現れ一意。
  await ws.send({ type: 'battle.hp_changed', battleId: 'b2', hpCurrent: 1 })
  await expect(page.getByText('1/2')).toBeVisible()
  await ws.send({
    type: 'battle.defeated',
    battleId: 'b2',
    enemyId: 11,
    reward: { kind: 'weapon', name: '酒場の戦利品', description: '次の力', abilityId: null },
  })
  await expect(page.getByText('b2・撃破')).toBeVisible()
  await expect(page.getByText(/報酬獲得: 酒場の戦利品/)).toBeVisible()
})
