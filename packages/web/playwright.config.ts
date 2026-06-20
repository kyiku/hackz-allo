import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E 設定（タスク12.1 / 12.3）。
 * ビルド済みの web を vite preview で配信し、ブラウザから実アプリを駆動する。
 * Backend/Runner は `e2e/mock-ws.ts` の WebSocket モックで差し替え、外部依存なしで決定的に検証する。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
