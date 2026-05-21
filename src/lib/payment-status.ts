import type { InvoiceStatus } from '#/server/schema'

export function sumPayments(payments: ReadonlyArray<{ amountCents: bigint }>): bigint {
  return payments.reduce((sum, p) => sum + p.amountCents, 0n)
}

export function remainingBalanceCents(totalCents: bigint, paidCents: bigint): bigint {
  return totalCents - paidCents
}

export function paymentWouldOverpay(
  amountCents: bigint,
  totalCents: bigint,
  paidCents: bigint,
): boolean {
  return amountCents > remainingBalanceCents(totalCents, paidCents)
}

export function statusAfterPaymentChange(
  current: InvoiceStatus,
  totalCents: bigint,
  paidCents: bigint,
): InvoiceStatus {
  if (current === 'sent' && totalCents > 0n && paidCents >= totalCents) {
    return 'paid'
  }

  if (current === 'paid' && paidCents < totalCents) {
    return 'sent'
  }

  return current
}
