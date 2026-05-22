import type { InvoiceStatus } from '#/server/schema'

export type InvoiceActivityEvent = { at: Date; label: string }

type InvoiceLike = {
  createdAt: Date | string
  // Set by the server only when status actually flips, so it's a reliable
  // timestamp for "Marked as paid" / "Voided".  Null for rows created before
  // the column existed, or for draft/sent rows that never transitioned; the
  // feed degrades to updatedAt and then createdAt in that order.
  statusChangedAt?: Date | string | null
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

  const statusChangedAt = new Date(
    invoice.statusChangedAt ?? invoice.updatedAt ?? invoice.createdAt,
  )
  if (invoice.status === 'paid') {
    events.push({ at: statusChangedAt, label: 'Marked as paid' })
  } else if (invoice.status === 'void') {
    events.push({ at: statusChangedAt, label: 'Voided' })
  }

  return events.sort((a, b) => b.at.getTime() - a.at.getTime())
}
