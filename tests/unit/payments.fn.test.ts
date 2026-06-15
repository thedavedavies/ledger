import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { eq, like, sql } from 'drizzle-orm'
import { dateOnlyToUtcDate, utcDateToDateOnly } from '#/lib/date-only'
import { client, invoice, payment } from '#/server/schema'

try {
  process.loadEnvFile()
} catch {
  /* .env is optional; skip these integration tests when DATABASE_URL is absent. */
}

type DbModule = typeof import('#/server/db')
type PaymentsModule = typeof import('#/server/payments.fn')

const TEST_PREFIX = `PAYTEST-${Date.now()}`

async function canReachDatabase() {
  if (!process.env['DATABASE_URL']) return false

  try {
    const { db } = await import('#/server/db')
    await db.execute(sql`select 1`)
    return true
  } catch {
    return false
  }
}

const describeDb = (await canReachDatabase()) ? describe : describe.skip

let db: DbModule['db']
let createPayment: PaymentsModule['createPayment']
let deletePayment: PaymentsModule['deletePayment']

async function cleanup() {
  await db.delete(invoice).where(like(invoice.number, `${TEST_PREFIX}-%`))
  await db.delete(client).where(like(client.name, `${TEST_PREFIX}-%`))
}

async function createClient() {
  const [row] = await db
    .insert(client)
    .values({
      name: `${TEST_PREFIX}-client-${randomUUID()}`,
      email: 'payments@example.test',
    })
    .returning()

  if (!row) throw new Error('Failed to create test client')
  return row
}

async function createInvoice(status: 'draft' | 'sent' | 'paid' | 'void', totalCents = 10000n) {
  const c = await createClient()
  const [row] = await db
    .insert(invoice)
    .values({
      number: `${TEST_PREFIX}-${randomUUID()}`,
      clientId: c.id,
      status,
      issueDate: dateOnlyToUtcDate('2026-05-01'),
      dueDate: dateOnlyToUtcDate('2026-05-31'),
      subtotalCents: totalCents,
      taxCents: 0n,
      totalCents,
      taxRate: '0',
      notes: '',
    })
    .returning()

  if (!row) throw new Error('Failed to create test invoice')
  return row
}

async function getInvoice(id: string) {
  return db
    .select()
    .from(invoice)
    .where(eq(invoice.id, id))
    .then((rows) => rows[0] ?? null)
}

async function getPayments(invoiceId: string) {
  return db.select().from(payment).where(eq(payment.invoiceId, invoiceId))
}

describeDb('payment server functions', () => {
  beforeAll(async () => {
    const [dbModule, paymentsModule] = await Promise.all([
      import('#/server/db'),
      import('#/server/payments.fn'),
    ])
    db = dbModule.db
    createPayment = paymentsModule.createPayment
    deletePayment = paymentsModule.deletePayment
  })

  afterEach(async () => {
    await cleanup()
  })

  it('records a partial payment and keeps the invoice sent', async () => {
    const inv = await createInvoice('sent', 10000n)

    await createPayment({
      data: {
        invoiceId: inv.id,
        amount: '40.00',
        paidAt: '2026-05-09',
        method: 'Bank transfer',
        reference: 'REF-1',
        notes: '',
      },
    })

    const [created] = await getPayments(inv.id)
    if (!created) throw new Error('Expected payment to be created')
    expect(created.amountCents).toBe(4000n)
    expect(utcDateToDateOnly(created.paidAt)).toBe('2026-05-09')
    await expect(getPayments(inv.id)).resolves.toHaveLength(1)
    await expect(getInvoice(inv.id)).resolves.toMatchObject({ status: 'sent' })
  })

  it('marks a sent invoice paid when payments cover the total', async () => {
    const inv = await createInvoice('sent', 10000n)

    await createPayment({
      data: {
        invoiceId: inv.id,
        amount: '100.00',
        paidAt: '2026-05-09',
        method: 'Card',
        reference: '',
        notes: '',
      },
    })

    await expect(getInvoice(inv.id)).resolves.toMatchObject({ status: 'paid' })
  })

  it('reopens a paid invoice when a payment is deleted', async () => {
    const inv = await createInvoice('sent', 10000n)
    await createPayment({
      data: {
        invoiceId: inv.id,
        amount: '40.00',
        paidAt: '2026-05-09',
        method: 'Bank transfer',
        reference: '',
        notes: '',
      },
    })
    const [first] = await getPayments(inv.id)
    if (!first) throw new Error('Expected first payment to be created')
    await createPayment({
      data: {
        invoiceId: inv.id,
        amount: '60.00',
        paidAt: '2026-05-10',
        method: 'Card',
        reference: '',
        notes: '',
      },
    })

    await expect(getInvoice(inv.id)).resolves.toMatchObject({ status: 'paid' })

    await deletePayment({ data: { id: first.id } })

    await expect(getInvoice(inv.id)).resolves.toMatchObject({ status: 'sent' })
    await expect(getPayments(inv.id)).resolves.toHaveLength(1)
  })

  it('rejects overpayments', async () => {
    const inv = await createInvoice('sent', 10000n)

    await createPayment({
      data: {
        invoiceId: inv.id,
        amount: '80.00',
        paidAt: '2026-05-09',
        method: 'Bank transfer',
        reference: '',
        notes: '',
      },
    })

    await expect(
      createPayment({
        data: {
          invoiceId: inv.id,
          amount: '20.01',
          paidAt: '2026-05-10',
          method: 'Card',
          reference: '',
          notes: '',
        },
      }),
    ).rejects.toThrow('Payment exceeds the remaining invoice balance')
  })

  it('rejects payments for draft and void invoices', async () => {
    const draft = await createInvoice('draft')
    const voided = await createInvoice('void')

    const data = {
      amount: '10.00',
      paidAt: '2026-05-09',
      method: 'Cash',
      reference: '',
      notes: '',
    }

    await expect(createPayment({ data: { ...data, invoiceId: draft.id } })).rejects.toThrow(
      'Payments can only be recorded against sent or paid invoices',
    )
    await expect(createPayment({ data: { ...data, invoiceId: voided.id } })).rejects.toThrow(
      'Payments can only be recorded against sent or paid invoices',
    )
  })
})
