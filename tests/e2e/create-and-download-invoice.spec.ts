import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

// TanStack Start sets window.__TSR_ROUTER__ once the client router is mounted.
// Waiting on it before interaction avoids racing hydration in the Vite dev server.
async function gotoHydrated(page: Page, url: string) {
  await page.goto(url)
  await page.waitForFunction(() => '__TSR_ROUTER__' in window)
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      }),
  )
}

async function createInvoice(page: Page) {
  const clientName = `E2E Test Client ${Date.now()}`

  await gotoHydrated(page, '/clients/new')

  const contactName = page.getByLabel('Contact name')
  await expect(contactName).toBeEditable()
  await contactName.fill(clientName)

  const email = page.getByLabel('Email')
  await email.fill('e2e@test.com')
  await expect(contactName).toHaveValue(clientName)
  await expect(email).toHaveValue('e2e@test.com')

  await page.getByRole('button', { name: 'Create client' }).click()

  await page.waitForURL(/\/clients\/?$/)

  await gotoHydrated(page, '/invoices/new')

  await page.getByLabel('Client').click()
  await page.getByRole('option', { name: clientName }).click()
  await page.getByLabel('Issue date').fill('2026-01-15')
  await page.getByLabel('Due date').click()
  await page.getByRole('option', { name: 'Custom date' }).click()
  await page.getByLabel('Custom due date').fill('2026-02-15')
  await page.getByLabel('Tax rate (%)').fill('0')

  await page.getByLabel('Description for line item 1').fill('E2E service')
  await page.getByLabel('Quantity for line item 1').fill('2')
  await page.getByLabel('Unit price for line item 1').fill('100.00')

  await page.getByRole('button', { name: /create/i }).click()

  await page.waitForURL(/\/invoices\/[a-f0-9-]+\/?$/)

  return { clientName }
}

test('create invoice and download PDF', async ({ page }) => {
  await createInvoice(page)

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

test('record and remove a payment', async ({ page }) => {
  await createInvoice(page)

  const sendDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Send' }).click()
  await sendDownload

  await expect(page.getByText('Sent').first()).toBeVisible()

  await page.getByRole('button', { name: 'Record payment' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Record payment' })
  await expect(dialog.getByLabel('Amount')).toHaveValue('200.00')
  await dialog.getByRole('button', { name: /^Record / }).click()

  await expect(page.getByText('Invoice fully paid.')).toBeVisible()
  await expect(page.getByText('Paid').first()).toBeVisible()

  await page.getByRole('button', { name: /^Remove payment of/ }).click()
  await page
    .getByRole('dialog', { name: 'Remove payment?' })
    .getByRole('button', { name: 'Remove' })
    .click()

  await expect(page.getByText('None recorded')).toBeVisible()
  await expect(page.getByText('Sent').first()).toBeVisible()
})

test('PDF route returns 404 for an unknown invoice', async ({ page }) => {
  const response = await page.request.get('/api/invoices/00000000-0000-4000-8000-000000000000/pdf')

  expect(response.status()).toBe(404)
  await expect(response.text()).resolves.toBe('Invoice not found')
})

test('core pages render at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })

  await gotoHydrated(page, '/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await gotoHydrated(page, '/clients/new')
  await expect(page.getByRole('heading', { name: 'New client' })).toBeVisible()
  await expect(page.getByLabel('Contact name')).toBeEditable()

  await gotoHydrated(page, '/invoices/new')
  await expect(page.getByRole('heading', { name: 'New invoice' })).toBeVisible()
  await expect(page.getByLabel('Issue date')).toBeEditable()

  await gotoHydrated(page, '/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await expect(page.getByLabel('Business name')).toBeEditable()
})
