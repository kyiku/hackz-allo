import { z } from 'zod/v4'
import type { Difficulty } from '@github-issue-rpg/shared'
import type { StructuredGenerator } from '../ai/structured-generator.js'

/**
 * 敵ステータス算出（要件5.4）。
 * 必要テストはLLM生成、HP=対象テスト件数、難易度Lv/弱点はルールベース。
 * テストの書き込み・RED確認・対象テスト固定（HP確定）はタスク6.6で行う。
 */

/** テスト件数から難易度を決める（ルールベース）。 */
export function computeDifficulty(testCount: number): Difficulty {
  if (testCount <= 2) return 'easy'
  if (testCount <= 5) return 'normal'
  if (testCount <= 10) return 'hard'
  return 'boss'
}

const WEAKNESS_BY_LABEL: Record<string, string> = {
  bug: 'null-check',
  security: 'injection',
  refactor: 'complexity',
  performance: 'allocation',
}

/** ラベルから弱点を導く（ルールベース）。該当が無ければ汎用。 */
export function deriveWeakness(labels: readonly string[]): string {
  for (const label of labels) {
    const weakness = WEAKNESS_BY_LABEL[label.toLowerCase()]
    if (weakness) {
      return weakness
    }
  }
  return 'edge-case'
}

export interface EnemyStats {
  hpTotal: number
  hpCurrent: number
  difficulty: Difficulty
  weakness: string
}

export interface BuildEnemyStatsParams {
  requiredTests: readonly string[]
  labels: readonly string[]
}

/** 必要テストとラベルから敵ステータスを構築する。HPは最低1を保証する。 */
export function buildEnemyStats({ requiredTests, labels }: BuildEnemyStatsParams): EnemyStats {
  const hpTotal = Math.max(1, requiredTests.length)
  return {
    hpTotal,
    hpCurrent: hpTotal,
    difficulty: computeDifficulty(hpTotal),
    weakness: deriveWeakness(labels),
  }
}

const requiredTestsSchema = z.object({
  tests: z.array(z.string()).describe('Issue解決に必要なテストケースの説明（日本語、簡潔に）'),
})

export interface IssueSummary {
  title: string
  body: string
  labels: readonly string[]
}

/** Issueから必要テスト一覧をLLMで生成する。 */
export async function generateRequiredTests(
  generator: StructuredGenerator,
  issue: IssueSummary,
): Promise<string[]> {
  const result = await generator.generate(requiredTestsSchema, {
    system:
      'あなたはTDDの専門家です。GitHub Issueを解決するために最低限必要なテストケースを列挙してください。',
    prompt: `タイトル: ${issue.title}\nラベル: ${issue.labels.join(', ')}\n本文:\n${issue.body}`,
  })
  return result.tests
}
