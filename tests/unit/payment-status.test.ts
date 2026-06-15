import { describe, expect, it } from 'vitest'
import {
  paymentWouldOverpay,
  remainingBalanceCents,
  statusAfterPaymentChange,
  sumPayments,
} from '#/lib/payment-status'

describe('payment status helpers', () => {
  it('sums payments and computes remaining balance', () => {
    const paid = sumPayments([{ amountCents: 3000n }, { amountCents: 2000n }])

    expect(paid).toBe(5000n)
    expect(remainingBalanceCents(10000n, paid)).toBe(5000n)
  })

  it('detects overpayments against the current balance', () => {
    expect(paymentWouldOverpay(5001n, 10000n, 5000n)).toBe(true)
    expect(paymentWouldOverpay(5000n, 10000n, 5000n)).toBe(false)
  })

  it('marks sent invoices paid when payments cover the total', () => {
    expect(statusAfterPaymentChange('sent', 10000n, 9999n)).toBe('sent')
    expect(statusAfterPaymentChange('sent', 10000n, 10000n)).toBe('paid')
  })

  it('reopens paid invoices when a payment is removed', () => {
    expect(statusAfterPaymentChange('paid', 10000n, 9999n)).toBe('sent')
  })

  it('does not silently mutate draft or void invoices', () => {
    expect(statusAfterPaymentChange('draft', 10000n, 10000n)).toBe('draft')
    expect(statusAfterPaymentChange('void', 10000n, 10000n)).toBe('void')
  })
})
