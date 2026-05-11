import { describe, expect, it } from 'vitest'
import {
  addMonths,
  buildMonthlySeries,
  buildOutstandingInvoices,
  computeKpi,
  emptyMonthlySeries,
  monthKey,
  percentChange,
  startOfMonth,
  type RawInvoice,
  type RawPayment,
} from '#/lib/dashboard'

const ref = new Date(2026, 4, 11) // 11 May 2026 (month index 4)

function inv(partial: Partial<RawInvoice>): RawInvoice {
  return {
    id: 'i1',
    number: 'INV-2026-001',
    status: 'sent',
    issueDate: new Date(2026, 4, 1),
    dueDate: new Date(2026, 5, 1),
    totalCents: 100000n,
    clientName: 'Acme',
    ...partial,
  }
}

function pay(partial: Partial<RawPayment>): RawPayment {
  return {
    invoiceId: 'i1',
    amountCents: 10000n,
    paidAt: new Date(2026, 4, 5),
    ...partial,
  }
}

describe('startOfMonth', () => {
  it('returns the first day of the month at local midnight', () => {
    const result = startOfMonth(new Date(2026, 4, 15, 13, 30))
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(4)
    expect(result.getDate()).toBe(1)
    expect(result.getHours()).toBe(0)
  })
})

describe('addMonths', () => {
  it('rolls forward past year end', () => {
    const result = addMonths(new Date(2026, 10, 1), 3) // Nov + 3 = Feb 2027
    expect(result.getFullYear()).toBe(2027)
    expect(result.getMonth()).toBe(1)
  })

  it('rolls backward past year start', () => {
    const result = addMonths(new Date(2026, 1, 1), -3) // Feb - 3 = Nov 2025
    expect(result.getFullYear()).toBe(2025)
    expect(result.getMonth()).toBe(10)
  })
})

describe('monthKey', () => {
  it('zero pads month', () => {
    expect(monthKey(new Date(2026, 0, 15))).toBe('2026-01')
    expect(monthKey(new Date(2026, 11, 31))).toBe('2026-12')
  })
})

describe('emptyMonthlySeries', () => {
  it('returns 12 buckets oldest first, ending at reference month', () => {
    const series = emptyMonthlySeries(ref, 12)
    expect(series).toHaveLength(12)
    // Reference is May 2026, so window is Jun 2025 .. May 2026
    expect(series[0]!.key).toBe('2025-06')
    expect(series[11]!.key).toBe('2026-05')
    expect(series[0]!.shortLabel).toBe('J')
    expect(series[11]!.shortLabel).toBe('M')
    expect(series[11]!.longLabel).toBe('May 2026')
    for (const b of series) expect(b.totalCents).toBe(0n)
  })
})

describe('buildMonthlySeries', () => {
  it('buckets invoices into their issue-date month', () => {
    const series = buildMonthlySeries(
      [
        inv({ id: 'a', totalCents: 100000n, issueDate: new Date(2026, 4, 2) }),
        inv({ id: 'b', totalCents: 200000n, issueDate: new Date(2026, 4, 20) }),
        inv({ id: 'c', totalCents: 50000n, issueDate: new Date(2026, 3, 15) }),
      ],
      ref,
    )
    const may = series.find((b) => b.key === '2026-05')!
    const apr = series.find((b) => b.key === '2026-04')!
    expect(may.totalCents).toBe(300000n)
    expect(apr.totalCents).toBe(50000n)
  })

  it('ignores void invoices', () => {
    const series = buildMonthlySeries(
      [
        inv({ id: 'a', status: 'void', totalCents: 100000n }),
        inv({ id: 'b', status: 'sent', totalCents: 50000n }),
      ],
      ref,
    )
    const may = series.find((b) => b.key === '2026-05')!
    expect(may.totalCents).toBe(50000n)
  })

  it('ignores invoices outside the 12-month window', () => {
    const series = buildMonthlySeries(
      [inv({ id: 'old', totalCents: 999999n, issueDate: new Date(2024, 0, 1) })],
      ref,
    )
    const total = series.reduce((s, b) => s + b.totalCents, 0n)
    expect(total).toBe(0n)
  })

  it('returns 12 buckets even with no invoices', () => {
    const series = buildMonthlySeries([], ref)
    expect(series).toHaveLength(12)
    expect(series.every((b) => b.totalCents === 0n)).toBe(true)
  })
})

describe('buildOutstandingInvoices', () => {
  it('only includes status=sent invoices with positive balance', () => {
    const result = buildOutstandingInvoices(
      [
        inv({ id: 'draft', status: 'draft' }),
        inv({ id: 'paid', status: 'paid' }),
        inv({ id: 'void', status: 'void' }),
        inv({ id: 'open', status: 'sent', totalCents: 100000n }),
      ],
      [],
      ref,
    )
    expect(result.map((o) => o.id)).toEqual(['open'])
    expect(result[0]!.balanceCents).toBe(100000n)
  })

  it('subtracts payments from totals', () => {
    const result = buildOutstandingInvoices(
      [inv({ id: 'a', status: 'sent', totalCents: 100000n })],
      [
        pay({ invoiceId: 'a', amountCents: 30000n }),
        pay({ invoiceId: 'a', amountCents: 20000n }),
      ],
      ref,
    )
    expect(result[0]!.balanceCents).toBe(50000n)
  })

  it('excludes fully paid sent invoices', () => {
    const result = buildOutstandingInvoices(
      [inv({ id: 'a', status: 'sent', totalCents: 100000n })],
      [pay({ invoiceId: 'a', amountCents: 100000n })],
      ref,
    )
    expect(result).toEqual([])
  })

  it('marks invoices overdue by due date', () => {
    const result = buildOutstandingInvoices(
      [
        inv({
          id: 'past',
          status: 'sent',
          dueDate: new Date(2026, 3, 1), // April: before May 11 ref
        }),
        inv({
          id: 'future',
          status: 'sent',
          dueDate: new Date(2026, 5, 1), // June: after May 11 ref
        }),
      ],
      [],
      ref,
    )
    const byId = Object.fromEntries(result.map((o) => [o.id, o]))
    expect(byId.past!.isOverdue).toBe(true)
    expect(byId.future!.isOverdue).toBe(false)
  })

  it('sorts oldest due first', () => {
    const result = buildOutstandingInvoices(
      [
        inv({ id: 'c', dueDate: new Date(2026, 6, 1) }),
        inv({ id: 'a', dueDate: new Date(2026, 3, 1) }),
        inv({ id: 'b', dueDate: new Date(2026, 5, 1) }),
      ],
      [],
      ref,
    )
    expect(result.map((o) => o.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('computeKpi', () => {
  it('separates this-month and last-month windows', () => {
    const invoices: RawInvoice[] = [
      inv({ id: 'thisMay', issueDate: new Date(2026, 4, 5), totalCents: 200000n }),
      inv({ id: 'thisMay2', issueDate: new Date(2026, 4, 30), totalCents: 100000n }),
      inv({ id: 'apr', issueDate: new Date(2026, 3, 10), totalCents: 150000n }),
      inv({ id: 'mar', issueDate: new Date(2026, 2, 1), totalCents: 999n }),
    ]
    const payments: RawPayment[] = [
      pay({ invoiceId: 'apr', amountCents: 50000n, paidAt: new Date(2026, 4, 1) }),
      pay({ invoiceId: 'apr', amountCents: 30000n, paidAt: new Date(2026, 3, 15) }),
    ]
    const outstanding = buildOutstandingInvoices(invoices, payments, ref)
    const kpi = computeKpi(invoices, payments, outstanding, ref)
    expect(kpi.invoicedThisMonthCents).toBe(300000n)
    expect(kpi.invoicedLastMonthCents).toBe(150000n)
    expect(kpi.paidThisMonthCents).toBe(50000n)
    expect(kpi.paidLastMonthCents).toBe(30000n)
  })

  it('excludes void invoices from invoiced KPIs', () => {
    const invoices = [
      inv({ id: 'a', status: 'sent', issueDate: new Date(2026, 4, 1), totalCents: 100000n }),
      inv({ id: 'b', status: 'void', issueDate: new Date(2026, 4, 1), totalCents: 999999n }),
    ]
    const kpi = computeKpi(invoices, [], [], ref)
    expect(kpi.invoicedThisMonthCents).toBe(100000n)
  })

  it('sums outstanding and overdue from the prebuilt list', () => {
    const outstanding = [
      {
        id: 'a', number: 'A', clientName: 'X',
        issueDate: new Date(), dueDate: new Date(),
        balanceCents: 50000n, isOverdue: true,
      },
      {
        id: 'b', number: 'B', clientName: 'Y',
        issueDate: new Date(), dueDate: new Date(),
        balanceCents: 20000n, isOverdue: false,
      },
    ]
    const kpi = computeKpi([], [], outstanding, ref)
    expect(kpi.outstandingCents).toBe(70000n)
    expect(kpi.overdueCents).toBe(50000n)
  })
})

describe('percentChange', () => {
  it('returns null when prev is zero', () => {
    expect(percentChange(100n, 0n)).toBe(null)
  })

  it('computes positive change to one decimal', () => {
    // 100 -> 124 == +24.0%
    expect(percentChange(124n, 100n)).toBe(24)
  })

  it('computes negative change', () => {
    // 100 -> 80 == -20.0%
    expect(percentChange(80n, 100n)).toBe(-20)
  })

  it('rounds to one decimal', () => {
    // 100 -> 112.3 (cents) -> 12.345% -> rounded to 12.3
    expect(percentChange(11234n, 10000n)).toBe(12.3)
  })
})
