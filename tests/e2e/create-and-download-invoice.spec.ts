import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

test('create invoice and download PDF', async ({ page }) => {
  await page.goto('/clients/new')

  await page.getByLabel('Name').fill('E2E Test Client')
  await page.getByLabel('Email').fill('e2e@test.com')
  await page.getByRole('button', { name: 'Create client' }).click()

  await page.waitForURL(/\/clients\//)

  await page.goto('/invoices/new')

  await page.getByLabel('Client').selectOption({ label: 'E2E Test Client' })
  await page.getByLabel('Issue date').fill('2026-01-15')
  await page.getByLabel('Due date').fill('2026-02-15')

  await page.getByPlaceholder('Description').first().fill('E2E service')
  await page.getByPlaceholder('Qty').first().fill('2')
  await page.getByPlaceholder('Price').first().fill('100.00')

  await page.getByRole('button', { name: /create/i }).click()

  await page.waitForURL(/\/invoices\/[a-f0-9-]+$/)

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('link', { name: /download pdf/i }).click()
  const download = await downloadPromise

  const downloadPath = path.join('tests/e2e/downloads', download.suggestedFilename())
  await download.saveAs(downloadPath)

  const content = fs.readFileSync(downloadPath)
  expect(content.length).toBeGreaterThan(1024)
  expect(content.subarray(0, 5).toString('ascii')).toBe('%PDF-')

  fs.rmSync(path.dirname(downloadPath), { recursive: true, force: true })
})
