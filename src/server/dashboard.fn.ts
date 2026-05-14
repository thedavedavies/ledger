import { createServerFn } from '@tanstack/react-start'
import { eq, gte, or } from 'drizzle-orm'
import {
  addMonths,
  buildMonthlySeries,
  buildOutstandingInvoices,
  computeKpi,
  startOfMonth,
  type RawInvoice,
} from '#/lib/dashboard'
import { db } from './db'
import { client, invoice, payment } from './schema'

const OUTSTANDING_TABLE_LIMIT = 6

export const getDashboardData = createServerFn({ method: 'GET' }).handler(async () => {
  const reference = new Date()
  const cutoff = startOfMonth(addMonths(reference, -11))

  const invoiceRows = await db
    .select({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      totalCents: invoice.totalCents,
      clientName: client.name,
    })
    .from(invoice)
    .innerJoin(client, eq(invoice.clientId, client.id))
    .where(or(gte(invoice.issueDate, cutoff), eq(invoice.status, 'sent')))

  const paymentRows = await db
    .select({
      invoiceId: payment.invoiceId,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt,
    })
    .from(payment)

  const invoices: RawInvoice[] = invoiceRows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status,
    issueDate: r.issueDate,
    dueDate: r.dueDate,
    totalCents: r.totalCents,
    clientName: r.clientName,
  }))

  const series = buildMonthlySeries(invoices, reference)
  const allOutstanding = buildOutstandingInvoices(invoices, paymentRows, reference)
  const kpi = computeKpi(invoices, paymentRows, allOutstanding, reference)

  return {
    kpi,
    series,
    outstanding: allOutstanding.slice(0, OUTSTANDING_TABLE_LIMIT),
    outstandingCount: allOutstanding.length,
    generatedAt: reference,
  }
})
