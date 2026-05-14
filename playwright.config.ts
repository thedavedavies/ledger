import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env['BASE_URL'] || 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: process.env['CI'] ? 'pnpm start' : 'pnpm dev',
    port: 3000,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
})
