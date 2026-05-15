import type { InvoiceStatus } from '#/server/schema'

export type InvoiceActivityEvent = { at: Date; label: string }

type InvoiceLike = {
  createdAt: Date | string
  // Used as the timestamp for "Marked as paid" / "Voided" events.  The invoice
  // row's updatedAt advances every time status changes; we don't yet have a
  // dedicated status_changed_at column.  Falls back to createdAt if missing.
  updatedAt?: Date | string
  status: InvoiceStatus
}

type PaymentLike = {
  createdAt: Date | string
  amountCents: bigint
  method: string
}

/**
 * Build a chronological activity feed for an invoice.
 *
 * Note: payment events use `createdAt` (the row insert timestamp) rather than
 * `paidAt` (a user-supplied date with no time component).  Otherwise a payment
 * recorded at 5pm against today's date would render as "17 hours ago" because
 * `paidAt` parses to midnight UTC.
 */
export function buildInvoiceActivity(
  invoice: InvoiceLike,
  payments: PaymentLike[],
  formatCents: (cents: bigint) => string,
): InvoiceActivityEvent[] {
  const events: InvoiceActivityEvent[] = [
    { at: new Date(invoice.createdAt), label: 'Invoice created' },
  ]

  for (const p of payments) {
    const suffix = p.method ? ` (${p.method})` : ''
    events.push({
      at: new Date(p.createdAt),
      label: `Payment recorded · ${formatCents(p.amountCents)}${suffix}`,
    })
  }

  const statusChangedAt = new Date(invoice.updatedAt ?? invoice.createdAt)
  if (invoice.status === 'paid') {
    events.push({ at: statusChangedAt, label: 'Marked as paid' })
  } else if (invoice.status === 'void') {
    events.push({ at: statusChangedAt, label: 'Voided' })
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime())
}
