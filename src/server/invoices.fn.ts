import { createServerFn } from '@tanstack/react-start'
import { desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { dateOnlyToUtcDate } from '#/lib/date-only'
import { invoiceInput, invoiceStatusInput } from '#/lib/validators'
import { toCents, computeInvoiceTotals } from '#/lib/money'
import { allocateInvoiceNumber } from './numbering'
import { db } from './db'
import { client, companyProfile, invoice, invoiceLineItem } from './schema'

export const listInvoices = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db
    .select({
      id: invoice.id,
      number: invoice.number,
      clientId: invoice.clientId,
      clientName: client.name,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      totalCents: invoice.totalCents,
    })
    .from(invoice)
    .innerJoin(client, eq(invoice.clientId, client.id))
    .orderBy(desc(invoice.issueDate), desc(invoice.createdAt))

  return rows
})

export const getInvoice = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const row = await db
      .select()
      .from(invoice)
      .where(eq(invoice.id, data.id))
      .then((rows) => rows[0] ?? null)

    if (!row) return null

    const clientRow = await db
      .select()
      .from(client)
      .where(eq(client.id, row.clientId))
      .then((rows) => rows[0] ?? null)

    const lineItems = await db
      .select()
      .from(invoiceLineItem)
      .where(eq(invoiceLineItem.invoiceId, data.id))
      .orderBy(invoiceLineItem.sortOrder)

    return { ...row, client: clientRow, lineItems }
  })

export const createInvoice = createServerFn({ method: 'POST' })
  .inputValidator(invoiceInput)
  .handler(async ({ data }) => {
    const clientRow = await db
      .select({ id: client.id })
      .from(client)
      .where(eq(client.id, data.clientId))
      .then((rows) => rows[0] ?? null)

    if (!clientRow) {
      return { success: false as const, error: 'Client not found' }
    }

    const profile = await db
      .select({
        invoicePrefix: companyProfile.invoicePrefix,
      })
      .from(companyProfile)
      .where(eq(companyProfile.id, 1))
      .then((rows) => rows[0])

    const prefix = profile?.invoicePrefix ?? 'INV'
    const taxRate = data.taxRate === '' ? 0 : Number(data.taxRate)

    const lines = data.lineItems.map((li) => ({
      quantity: li.quantity,
      unitPriceCents: toCents(li.unitPrice),
    }))

    const totals = computeInvoiceTotals(lines, taxRate)
    // Use UTC so a `YYYY-MM-DD` issueDate doesn't shift into the previous
    // calendar year on negative-offset servers (e.g. 2026-01-01 in UTC-5).
    const issueDate = dateOnlyToUtcDate(data.issueDate)
    const dueDate = dateOnlyToUtcDate(data.dueDate)
    const issueYear = issueDate.getUTCFullYear()

    const created = await db.transaction(async (tx) => {
      const invoiceNumber = await allocateInvoiceNumber(tx, issueYear, prefix)

      const [inv] = await tx
        .insert(invoice)
        .values({
          number: invoiceNumber,
          clientId: data.clientId,
          issueDate,
          dueDate,
          taxRate: String(taxRate),
          subtotalCents: totals.subtotalCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          notes: data.notes,
        })
        .returning()

      if (!inv) throw new Error('Failed to create invoice')

      const lineValues = data.lineItems.map((li, i) => ({
        invoiceId: inv.id,
        description: li.description,
        quantity: li.quantity,
        unitPriceCents: toCents(li.unitPrice),
        lineTotalCents: totals.lineTotals[i]!,
        sortOrder: i,
      }))

      await tx.insert(invoiceLineItem).values(lineValues)

      return inv
    })

    return { success: true as const, invoice: created }
  })

export const updateInvoice = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(invoiceInput))
  .handler(async ({ data }) => {
    const { id, ...fields } = data

    const clientRow = await db
      .select({ id: client.id })
      .from(client)
      .where(eq(client.id, fields.clientId))
      .then((rows) => rows[0] ?? null)

    if (!clientRow) {
      return { success: false as const, error: 'Client not found' }
    }

    const taxRate = fields.taxRate === '' ? 0 : Number(fields.taxRate)
    const issueDate = dateOnlyToUtcDate(fields.issueDate)
    const dueDate = dateOnlyToUtcDate(fields.dueDate)

    const lines = fields.lineItems.map((li) => ({
      quantity: li.quantity,
      unitPriceCents: toCents(li.unitPrice),
    }))

    const totals = computeInvoiceTotals(lines, taxRate)

    const updated = await db.transaction(async (tx) => {
      const [inv] = await tx
        .update(invoice)
        .set({
          clientId: fields.clientId,
          issueDate,
          dueDate,
          taxRate: String(taxRate),
          subtotalCents: totals.subtotalCents,
          taxCents: totals.taxCents,
          totalCents: totals.totalCents,
          notes: fields.notes,
          updatedAt: new Date(),
        })
        .where(eq(invoice.id, id))
        .returning()

      if (!inv) throw new Error('Invoice not found')

      await tx.delete(invoiceLineItem).where(eq(invoiceLineItem.invoiceId, id))

      const lineValues = fields.lineItems.map((li, i) => ({
        invoiceId: id,
        description: li.description,
        quantity: li.quantity,
        unitPriceCents: toCents(li.unitPrice),
        lineTotalCents: totals.lineTotals[i]!,
        sortOrder: i,
      }))

      await tx.insert(invoiceLineItem).values(lineValues)

      return inv
    })

    return { success: true as const, invoice: updated }
  })

export const deleteInvoice = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const [deleted] = await db.delete(invoice).where(eq(invoice.id, data.id)).returning()

    if (!deleted) {
      throw new Error('Invoice not found')
    }

    return { success: true as const }
  })

export const deleteInvoices = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }))
  .handler(async ({ data }) => {
    const deleted = await db
      .delete(invoice)
      .where(inArray(invoice.id, data.ids))
      .returning({ id: invoice.id })

    return { success: true as const, deletedCount: deleted.length }
  })

export const updateInvoiceStatus = createServerFn({ method: 'POST' })
  .inputValidator(invoiceStatusInput)
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(invoice)
      .set({
        status: data.status,
        updatedAt: new Date(),
      })
      .where(eq(invoice.id, data.id))
      .returning()

    if (!updated) {
      throw new Error('Invoice not found')
    }

    return { success: true as const, invoice: updated }
  })
