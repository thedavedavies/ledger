import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// TanStack Start sets window.__TSR_ROUTER__ once the client router is mounted.
// Waiting on it before interaction avoids racing hydration in the Vite dev server.
async function gotoHydrated(page: Page, url: string) {
  await page.goto(url)
  await page.waitForFunction(() => '__TSR_ROUTER__' in window)
}

test('create invoice and download PDF', async ({ page }) => {
  await gotoHydrated(page, '/clients/new')

  await page.getByLabel('Contact name').fill('E2E Test Client')
  await page.getByLabel('Email').fill('e2e@test.com')
  await page.getByRole('button', { name: 'Create client' }).click()

  await page.waitForURL(/\/clients$/)

  await gotoHydrated(page, '/invoices/new')

  await page.getByLabel('Client').click()
  await page.getByRole('option', { name: 'E2E Test Client' }).click()
  await page.getByLabel('Issue date').fill('2026-01-15')
  await page.getByLabel('Due date').fill('2026-02-15')

  await page.getByLabel('Description for line item 1').fill('E2E service')
  await page.getByLabel('Quantity for line item 1').fill('2')
  await page.getByLabel('Unit price for line item 1').fill('100.00')

  await page.getByRole('button', { name: /create/i }).click()

  await page.waitForURL(/\/invoices\/[a-f0-9-]+$/)

  await page.getByRole('button', { name: 'More actions' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: /download pdf/i }).click()
  const download = await downloadPromise

  const downloadPath = path.join('tests/e2e/downloads', download.suggestedFilename())
  await download.saveAs(downloadPath)

  const content = fs.readFileSync(downloadPath)
  expect(content.length).toBeGreaterThan(1024)
  expect(content.subarray(0, 5).toString('ascii')).toBe('%PDF-')

  fs.rmSync(path.dirname(downloadPath), { recursive: true, force: true })
})
