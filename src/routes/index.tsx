import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { MonthlyBarChart } from '#/components/dashboard/MonthlyBarChart'
import { percentChange } from '#/lib/dashboard'
import { formatMoney } from '#/lib/money'
import { getDashboardData } from '#/server/dashboard.fn'
import { getCompanyProfile } from '#/server/settings.fn'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [data, profile] = await Promise.all([getDashboardData(), getCompanyProfile()])
    return { data, profile }
  },
  component: DashboardPage,
})

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function DeltaLabel({
  current,
  prev,
  monthLabel,
}: {
  current: bigint
  prev: bigint
  monthLabel: string
}) {
  const pct = percentChange(current, prev)
  if (pct === null) {
    return <span className="text-muted-foreground">No activity in {monthLabel}</span>
  }
  const isUp = pct > 0
  const isFlat = pct === 0
  const Icon = isUp ? ArrowUpRight : ArrowDownRight
  const sign = isUp ? '+' : ''
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      {!isFlat && <Icon className="size-3" aria-hidden="true" />}
      <span>
        {sign}
        {pct.toFixed(1)}% vs {monthLabel}
      </span>
    </span>
  )
}

function KpiCard({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-serif text-[40px] leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {children && <p className="mt-2 text-xs">{children}</p>}
    </div>
  )
}

function DashboardPage() {
  const { data, profile } = Route.useLoaderData()
  const needsSetup = !profile.businessName
  const currency = profile.defaultCurrency || 'USD'

  const fmt = (cents: bigint) => formatMoney(cents, currency)

  const fmtAxis = (cents: bigint) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(cents) / 100)

  const prevMonthLabel = new Date(
    new Date().getFullYear(),
    new Date().getMonth() - 1,
    1,
  ).toLocaleDateString('en-US', { month: 'long' })

  return (
    <div>
      {needsSetup && (
        <Link
          to="/settings"
          className="mb-6 flex items-center rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 transition-colors hover:bg-blue-100"
        >
          Set up your business details before sending invoices &rarr;
        </Link>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-normal tracking-tight">Dashboard</h1>
        <Button asChild>
          <Link to="/invoices/new">
            <Plus className="size-4" />
            New invoice
          </Link>
        </Button>
      </div>

      <section
        aria-label="Monthly summary"
        className="mt-8 grid grid-cols-3 gap-10 border-b border-border pb-10"
      >
        <KpiCard label="Invoiced this month" value={fmt(data.kpi.invoicedThisMonthCents)}>
          <DeltaLabel
            current={data.kpi.invoicedThisMonthCents}
            prev={data.kpi.invoicedLastMonthCents}
            monthLabel={prevMonthLabel}
          />
        </KpiCard>
        <KpiCard label="Paid this month" value={fmt(data.kpi.paidThisMonthCents)}>
          <DeltaLabel
            current={data.kpi.paidThisMonthCents}
            prev={data.kpi.paidLastMonthCents}
            monthLabel={prevMonthLabel}
          />
        </KpiCard>
        <KpiCard label="Outstanding" value={fmt(data.kpi.outstandingCents)}>
          {data.kpi.overdueCents > 0n ? (
            <span className="text-muted-foreground">
              of which{' '}
              <span style={{ color: 'var(--color-status-overdue)' }}>
                {fmt(data.kpi.overdueCents)} overdue
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">Nothing overdue</span>
          )}
        </KpiCard>
      </section>

      <section className="mt-10">
        <MonthlyBarChart
          caption="Last 12 months"
          data={data.series}
          formatAxis={fmtAxis}
          formatTooltip={fmt}
        />
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-normal tracking-tight">Outstanding invoices</h2>
            {data.outstandingCount > data.outstanding.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                Showing {data.outstanding.length} of {data.outstandingCount}
              </p>
            )}
          </div>
          {data.outstandingCount > 0 && (
            <Link to="/invoices" className="text-sm text-[var(--color-accent)] hover:underline">
              View all
            </Link>
          )}
        </div>

        {data.outstanding.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Nothing outstanding. Every sent invoice has been paid.
          </p>
        ) : (
          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.outstanding.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/invoices/$invoiceId"
                        params={{ invoiceId: inv.id }}
                        className="hover:underline"
                      >
                        {inv.number}
                      </Link>
                    </TableCell>
                    <TableCell>{inv.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(inv.dueDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(inv.balanceCents)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`status-pill ${inv.isOverdue ? 'status-overdue' : 'status-sent'}`}
                      >
                        {inv.isOverdue ? 'Overdue' : 'Sent'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
