import { createServerFn } from '@tanstack/react-start'
import { asc, eq } from 'drizzle-orm'
import Decimal from 'decimal.js'
import { z } from 'zod'
import { paymentInput } from '#/lib/validators'
import { db } from './db'
import { payment } from './schema'

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
    // Convert decimal amount string (e.g. "3200.00") to integer cents using Decimal
    // for precision; matches the money math pattern used elsewhere.
    const amountCents = BigInt(new Decimal(data.amount).times(100).round().toFixed(0))

    const [created] = await db
      .insert(payment)
      .values({
        invoiceId: data.invoiceId,
        amountCents,
        paidAt: new Date(data.paidAt),
        method: data.method,
        reference: data.reference,
        notes: data.notes,
      })
      .returning()

    if (!created) {
      throw new Error('Failed to create payment')
    }

    return created
  })

export const deletePayment = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const [deleted] = await db.delete(payment).where(eq(payment.id, data.id)).returning()

    if (!deleted) {
      throw new Error('Payment not found')
    }

    return { success: true as const }
  })
