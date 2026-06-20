import { defineConfig } from 'vitest/config'

/**
 * Vitest（ユニット）対象は src 配下の *.test.ts(x) のみ。
 * Playwright の E2E（e2e/*.spec.ts）は Vitest の対象から除外する。
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
