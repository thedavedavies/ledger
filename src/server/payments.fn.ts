import { createServerFn } from '@tanstack/react-start'
import { asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { dateOnlyToUtcDate } from '#/lib/date-only'
import { toCents } from '#/lib/money'
import { paymentWouldOverpay, statusAfterPaymentChange, sumPayments } from '#/lib/payment-status'
import { paymentInput } from '#/lib/validators'
import { db } from './db'
import { invoice, payment } from './schema'

export const listPayments = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ invoiceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const rows = await db
      .select()
      .from(payment)
      .where(eq(payment.invoiceId, data.invoiceId))
      .orderBy(asc(payment.paidAt))
    return rows
  })

export const createPayment = createServerFn({ method: 'POST' })
  .inputValidator(paymentInput)
  .handler(async ({ data }) => {
    const amountCents = toCents(data.amount)
    const paidAt = dateOnlyToUtcDate(data.paidAt)

    const created = await db.transaction(async (tx) => {
      await tx.execute(
        sql`
          select ${invoice.id}
          from ${invoice}
          where ${invoice.id} = ${data.invoiceId}
          for update
        `,
      )

      const inv = await tx
        .select({
          id: invoice.id,
          status: invoice.status,
          totalCents: invoice.totalCents,
        })
        .from(invoice)
        .where(eq(invoice.id, data.invoiceId))
        .then((rows) => rows[0] ?? null)

      if (!inv) {
        throw new Error('Invoice not found')
      }

      if (inv.status !== 'sent' && inv.status !== 'paid') {
        throw new Error('Payments can only be recorded against sent or paid invoices')
      }

      const existingPayments = await tx
        .select({ amountCents: payment.amountCents })
        .from(payment)
        .where(eq(payment.invoiceId, data.invoiceId))

      const paidBefore = sumPayments(existingPayments)
      if (paymentWouldOverpay(amountCents, inv.totalCents, paidBefore)) {
        throw new Error('Payment exceeds the remaining invoice balance')
      }

      const [row] = await tx
        .insert(payment)
        .values({
          invoiceId: data.invoiceId,
          amountCents,
          paidAt,
          method: data.method,
          reference: data.reference,
          notes: data.notes,
        })
        .returning()

      if (!row) {
        throw new Error('Failed to create payment')
      }

      const nextStatus = statusAfterPaymentChange(
        inv.status,
        inv.totalCents,
        paidBefore + amountCents,
      )
      if (nextStatus !== inv.status) {
        await tx
          .update(invoice)
          .set({ status: nextStatus, updatedAt: new Date() })
          .where(eq(invoice.id, inv.id))
      }

      return row
    })

    if (!created) {
      throw new Error('Failed to create payment')
    }

    return created
  })

export const deletePayment = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: payment.id, invoiceId: payment.invoiceId })
        .from(payment)
        .where(eq(payment.id, data.id))
        .then((rows) => rows[0] ?? null)

      if (!existing) {
        throw new Error('Payment not found')
      }

      await tx.execute(
        sql`
          select ${invoice.id}
          from ${invoice}
          where ${invoice.id} = ${existing.invoiceId}
          for update
        `,
      )

      const inv = await tx
        .select({
          id: invoice.id,
          status: invoice.status,
          totalCents: invoice.totalCents,
        })
        .from(invoice)
        .where(eq(invoice.id, existing.invoiceId))
        .then((rows) => rows[0] ?? null)

      const [row] = await tx.delete(payment).where(eq(payment.id, data.id)).returning()

      if (!row) {
        throw new Error('Payment not found')
      }

      if (inv && (inv.status === 'sent' || inv.status === 'paid')) {
        const remainingPayments = await tx
          .select({ amountCents: payment.amountCents })
          .from(payment)
          .where(eq(payment.invoiceId, existing.invoiceId))

        const nextStatus = statusAfterPaymentChange(
          inv.status,
          inv.totalCents,
          sumPayments(remainingPayments),
        )
        if (nextStatus !== inv.status) {
          await tx
            .update(invoice)
            .set({ status: nextStatus, updatedAt: new Date() })
            .where(eq(invoice.id, inv.id))
        }
      }

      return row
    })

    return { success: true as const }
  })
