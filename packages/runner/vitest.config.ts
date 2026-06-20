import { defineConfig } from 'vitest/config'

/**
 * 純粋ロジック（HP算出/配置/報酬パース/状態機械等）のカバレッジ計測（要件、タスク12.2）。
 * IO 結線（factory / barrel / エントリ）は計測対象外とし、ロジックに 80% 閾値を課す。
 */
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/index.ts',
        'src/index.ts',
        'src/**/*-factory.ts',
        'src/workspace/node-workspace.ts',
        'src/ai/anthropic-factory.ts',
        // 型のみ宣言ファイル（実行コードを持たない）
        'src/github/octokit-like.ts',
        'src/github/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 80,
      },
    },
  },
})
