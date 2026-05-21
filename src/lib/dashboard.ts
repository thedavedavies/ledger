// Pure helpers for shaping dashboard data. Kept side-effect free so they can
// be unit tested without a database.

export type RawInvoice = {
  id: string
  number: string
  status: 'draft' | 'sent' | 'paid' | 'void'
  issueDate: Date
  dueDate: Date
  totalCents: bigint
  clientName: string
}

export type RawPayment = {
  invoiceId: string
  amountCents: bigint
  paidAt: Date
}

export type DashboardKpi = {
  invoicedThisMonthCents: bigint
  invoicedLastMonthCents: bigint
  paidThisMonthCents: bigint
  paidLastMonthCents: bigint
  outstandingCents: bigint
  overdueCents: bigint
}

export type MonthBucket = {
  key: string
  year: number
  month: number
  shortLabel: string
  longLabel: string
  totalCents: bigint
}

export type OutstandingInvoice = {
  id: string
  number: string
  clientName: string
  issueDate: Date
  dueDate: Date
  balanceCents: bigint
  isOverdue: boolean
}

const MONTH_SHORT = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

export function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1))
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

// Returns the most recent `count` months (oldest first) ending at the month
// containing `reference`. Each bucket is empty (totalCents = 0n) and must be
// filled by the caller.
export function emptyMonthlySeries(reference: Date, count: number): MonthBucket[] {
  const end = startOfMonth(reference)
  const out: MonthBucket[] = []
  for (let i = count - 1; i >= 0; i--) {
    const d = addMonths(end, -i)
    out.push({
      key: monthKey(d),
      year: d.getUTCFullYear(),
      month: d.getUTCMonth(),
      shortLabel: MONTH_SHORT[d.getUTCMonth()]!,
      longLabel: `${MONTH_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
      totalCents: 0n,
    })
  }
  return out
}

// Bucket invoices into a 12-month series by their issue date. Invoices outside
// the window or with status='void' are ignored.
export function buildMonthlySeries(
  invoices: ReadonlyArray<RawInvoice>,
  reference: Date,
  count = 12,
): MonthBucket[] {
  const series = emptyMonthlySeries(reference, count)
  const index = new Map(series.map((b, i) => [b.key, i]))

  for (const inv of invoices) {
    if (inv.status === 'void') continue
    const k = monthKey(inv.issueDate)
    const i = index.get(k)
    if (i === undefined) continue
    series[i]!.totalCents += inv.totalCents
  }
  return series
}

function sumInRange(
  rows: ReadonlyArray<{ at: Date; amountCents: bigint }>,
  start: Date,
  endExclusive: Date,
): bigint {
  let sum = 0n
  for (const r of rows) {
    if (r.at >= start && r.at < endExclusive) sum += r.amountCents
  }
  return sum
}

// Computes outstanding (sent and not fully paid) balances and which are
// overdue relative to `reference`.
export function buildOutstandingInvoices(
  invoices: ReadonlyArray<RawInvoice>,
  payments: ReadonlyArray<RawPayment>,
  reference: Date,
): OutstandingInvoice[] {
  const paidByInvoice = new Map<string, bigint>()
  for (const p of payments) {
    paidByInvoice.set(p.invoiceId, (paidByInvoice.get(p.invoiceId) ?? 0n) + p.amountCents)
  }

  const referenceDay = startOfUtcDay(reference)
  const out: OutstandingInvoice[] = []
  for (const inv of invoices) {
    if (inv.status !== 'sent') continue
    const paid = paidByInvoice.get(inv.id) ?? 0n
    const balance = inv.totalCents - paid
    if (balance <= 0n) continue
    out.push({
      id: inv.id,
      number: inv.number,
      clientName: inv.clientName,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      balanceCents: balance,
      isOverdue: inv.dueDate < referenceDay,
    })
  }
  // Oldest due first, most urgent at the top.
  out.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
  return out
}

export function computeKpi(
  invoices: ReadonlyArray<RawInvoice>,
  payments: ReadonlyArray<RawPayment>,
  outstanding: ReadonlyArray<OutstandingInvoice>,
  reference: Date,
): DashboardKpi {
  const thisMonthStart = startOfMonth(reference)
  const nextMonthStart = addMonths(thisMonthStart, 1)
  const lastMonthStart = addMonths(thisMonthStart, -1)

  const issuedRows = invoices
    .filter((i) => i.status !== 'void')
    .map((i) => ({ at: i.issueDate, amountCents: i.totalCents }))

  const paidRows = payments.map((p) => ({ at: p.paidAt, amountCents: p.amountCents }))

  let outstandingCents = 0n
  let overdueCents = 0n
  for (const o of outstanding) {
    outstandingCents += o.balanceCents
    if (o.isOverdue) overdueCents += o.balanceCents
  }

  return {
    invoicedThisMonthCents: sumInRange(issuedRows, thisMonthStart, nextMonthStart),
    invoicedLastMonthCents: sumInRange(issuedRows, lastMonthStart, thisMonthStart),
    paidThisMonthCents: sumInRange(paidRows, thisMonthStart, nextMonthStart),
    paidLastMonthCents: sumInRange(paidRows, lastMonthStart, thisMonthStart),
    outstandingCents,
    overdueCents,
  }
}

// Percentage change from `prev` to `current`, rounded to 1 decimal. Returns
// null when `prev` is zero (no meaningful percentage), so callers can render
// a different label.
export function percentChange(current: bigint, prev: bigint): number | null {
  if (prev === 0n) return null
  const diff = Number(current - prev)
  const denom = Number(prev)
  return Math.round((diff / denom) * 1000) / 10
}
