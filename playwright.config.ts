import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: {
    baseURL: process.env['BASE_URL'] || 'http://localhost:3000',
    headless: true,
  },
  webServer: process.env['CI']
    ? undefined
    : {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: true,
      },
})
