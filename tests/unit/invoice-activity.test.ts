import { describe, it, expect } from 'vitest'
import { buildInvoiceActivity } from '#/lib/invoice-activity'

const fmt = (cents: bigint) => `$${(Number(cents) / 100).toFixed(2)}`

const baseInvoice = {
  createdAt: new Date('2026-05-01T10:00:00Z'),
  status: 'sent' as const,
}

describe('buildInvoiceActivity', () => {
  it('always emits an "Invoice created" event for the invoice', () => {
    const events = buildInvoiceActivity(baseInvoice, [], fmt)
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      at: new Date('2026-05-01T10:00:00Z'),
      label: 'Invoice created',
    })
  })

  it('uses payment.createdAt (not paidAt) for the activity timestamp', () => {
    // Regression test for the "20 hours ago" bug: paidAt is a user-supplied
    // date with no time and would parse to midnight UTC, making fresh entries
    // look stale.  createdAt is the row insert time and is what the activity
    // feed should reflect.
    const payment = {
      createdAt: new Date('2026-05-09T17:30:00Z'),
      // Intentionally include `paidAt` to prove the function ignores it.
      paidAt: new Date('2026-05-09T00:00:00Z'),
      amountCents: 50_000n,
      method: '',
    }
    const events = buildInvoiceActivity(baseInvoice, [payment], fmt)
    const paymentEvent = events.find((e) => e.label.startsWith('Payment recorded'))
    expect(paymentEvent?.at).toEqual(new Date('2026-05-09T17:30:00Z'))
  })

  it('formats the payment label with currency and optional method', () => {
    const events = buildInvoiceActivity(
      baseInvoice,
      [
        {
          createdAt: new Date('2026-05-09T12:00:00Z'),
          amountCents: 120_000n,
          method: 'Bank transfer',
        },
      ],
      fmt,
    )
    expect(events[0]?.label).toBe('Payment recorded · $1200.00 (Bank transfer)')
  })

  it('omits the method suffix when empty', () => {
    const events = buildInvoiceActivity(
      baseInvoice,
      [
        {
          createdAt: new Date('2026-05-09T12:00:00Z'),
          amountCents: 75_000n,
          method: '',
        },
      ],
      fmt,
    )
    expect(events[0]?.label).toBe('Payment recorded · $750.00')
  })

  it('appends "Marked as paid" when the invoice is paid', () => {
    const events = buildInvoiceActivity({ ...baseInvoice, status: 'paid' }, [], fmt)
    expect(events.some((e) => e.label === 'Marked as paid')).toBe(true)
  })

  it('appends "Voided" when the invoice is void', () => {
    const events = buildInvoiceActivity({ ...baseInvoice, status: 'void' }, [], fmt)
    expect(events.some((e) => e.label === 'Voided')).toBe(true)
  })

  it('timestamps status-change events from statusChangedAt, not render time', () => {
    // Regression: previously emitted `new Date()` so an invoice viewed weeks
    // after being paid kept reading "just now".
    const statusChangedAt = new Date('2026-05-09T10:30:00Z')
    const events = buildInvoiceActivity(
      { ...baseInvoice, status: 'paid', statusChangedAt },
      [],
      fmt,
    )
    const paidEvent = events.find((e) => e.label === 'Marked as paid')
    expect(paidEvent?.at).toEqual(statusChangedAt)
  })

  it('ignores updatedAt edits after status change', () => {
    // Regression: previously read invoice.updatedAt, which advances on any
    // edit, so editing a paid invoice's notes shifted "Marked as paid" to the
    // edit time.  statusChangedAt is only written when status actually flips.
    const statusChangedAt = new Date('2026-05-09T10:30:00Z')
    const updatedAt = new Date('2026-05-20T15:00:00Z') // a later, unrelated edit
    const events = buildInvoiceActivity(
      { ...baseInvoice, status: 'paid', statusChangedAt, updatedAt },
      [],
      fmt,
    )
    const paidEvent = events.find((e) => e.label === 'Marked as paid')
    expect(paidEvent?.at).toEqual(statusChangedAt)
  })

  it('falls back to updatedAt when statusChangedAt is missing', () => {
    // Pre-migration rows have no statusChangedAt; the feed still needs to
    // render something sensible.
    const updatedAt = new Date('2026-05-15T09:00:00Z')
    const events = buildInvoiceActivity({ ...baseInvoice, status: 'paid', updatedAt }, [], fmt)
    const paidEvent = events.find((e) => e.label === 'Marked as paid')
    expect(paidEvent?.at).toEqual(updatedAt)
  })

  it('falls back to createdAt when both statusChangedAt and updatedAt are missing', () => {
    const events = buildInvoiceActivity({ ...baseInvoice, status: 'void' }, [], fmt)
    const voidEvent = events.find((e) => e.label === 'Voided')
    expect(voidEvent?.at).toEqual(new Date(baseInvoice.createdAt))
  })

  it('does not append a status event for draft or sent', () => {
    const draft = buildInvoiceActivity({ ...baseInvoice, status: 'draft' }, [], fmt)
    const sent = buildInvoiceActivity({ ...baseInvoice, status: 'sent' }, [], fmt)
    expect(draft.map((e) => e.label)).toEqual(['Invoice created'])
    expect(sent.map((e) => e.label)).toEqual(['Invoice created'])
  })

  it('returns events newest-first', () => {
    const events = buildInvoiceActivity(
      { ...baseInvoice, status: 'paid' },
      [
        {
          createdAt: new Date('2026-05-05T09:00:00Z'),
          amountCents: 10_000n,
          method: '',
        },
        {
          createdAt: new Date('2026-05-08T09:00:00Z'),
          amountCents: 20_000n,
          method: '',
        },
      ],
      fmt,
    )
    const timestamps = events.map((e) => e.at.getTime())
    const sortedDesc = [...timestamps].sort((a, b) => b - a)
    expect(timestamps).toEqual(sortedDesc)
  })

  it('accepts string ISO timestamps for createdAt', () => {
    const events = buildInvoiceActivity(
      { createdAt: '2026-05-01T10:00:00Z', status: 'sent' },
      [
        {
          createdAt: '2026-05-09T12:00:00Z',
          amountCents: 1_000n,
          method: '',
        },
      ],
      fmt,
    )
    expect(events.map((e) => e.at)).toEqual([
      new Date('2026-05-09T12:00:00Z'),
      new Date('2026-05-01T10:00:00Z'),
    ])
  })
})
