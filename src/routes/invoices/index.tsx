import { useMemo, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, Search, Trash2, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { dateOnlyToUtcDate, formatDateOnly, localDateToDateOnly } from '#/lib/date-only'
import { formatMoney } from '#/lib/money'
import { getCompanyProfile } from '#/server/settings.fn'
import { listClients } from '#/server/clients.fn'
import { deleteInvoices, listInvoices } from '#/server/invoices.fn'
import type { InvoiceStatus } from '#/server/schema'

type StatusFilter = InvoiceStatus | 'all' | 'overdue'
type DatePreset = 'all' | 'this-month' | 'last-month' | 'this-quarter' | 'this-year' | 'last-year'

const PAGE_SIZE = 25

export const Route = createFileRoute('/invoices/')({
  head: () => ({ meta: [{ title: 'Invoices · Ledger' }] }),
  loader: async () => {
    const [invoices, clients, profile] = await Promise.all([
      listInvoices(),
      listClients(),
      getCompanyProfile(),
    ])
    return { invoices, clients, profile }
  },
  component: InvoicesPage,
})

const STATUS_STYLES: Record<InvoiceStatus | 'overdue', string> = {
  draft: 'status-draft',
  sent: 'status-sent',
  paid: 'status-paid',
  void: 'status-void',
  overdue: 'status-overdue',
}

function StatusBadge({ status, overdue }: { status: InvoiceStatus; overdue?: boolean }) {
  const effective = overdue ? 'overdue' : status
  return (
    <span className={`status-pill ${STATUS_STYLES[effective]}`}>
      {effective.charAt(0).toUpperCase() + effective.slice(1)}
    </span>
  )
}

function startOfToday(): Date {
  return dateOnlyToUtcDate(localDateToDateOnly())
}

function formatDate(date: string | Date): string {
  return formatDateOnly(date)
}

// End is exclusive (start of next period). Returns null for 'all'.
function dateRangeFor(preset: DatePreset, today: Date): { start: Date; end: Date } | null {
  if (preset === 'all') return null
  const y = today.getUTCFullYear()
  const m = today.getUTCMonth()
  switch (preset) {
    case 'this-month':
      return { start: new Date(Date.UTC(y, m, 1)), end: new Date(Date.UTC(y, m + 1, 1)) }
    case 'last-month':
      return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) }
    case 'this-quarter': {
      const qStart = Math.floor(m / 3) * 3
      return {
        start: new Date(Date.UTC(y, qStart, 1)),
        end: new Date(Date.UTC(y, qStart + 3, 1)),
      }
    }
    case 'this-year':
      return { start: new Date(Date.UTC(y, 0, 1)), end: new Date(Date.UTC(y + 1, 0, 1)) }
    case 'last-year':
      return { start: new Date(Date.UTC(y - 1, 0, 1)), end: new Date(Date.UTC(y, 0, 1)) }
  }
}

// Smart page-number list with ellipses for large totals.
function pageItems(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: (number | 'gap')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) items.push('gap')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < total - 1) items.push('gap')
  items.push(total)
  return items
}

function InvoicesPage() {
  const { invoices, clients, profile } = Route.useLoaderData()
  const router = useRouter()
  const needsSetup = !profile.businessName
  const currency = profile.defaultCurrency || 'USD'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [clientFilter, setClientFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<DatePreset>('all')
  const [page, setPage] = useState(1)
  const [rawSelectedIds, setRawSelectedIds] = useState<Set<string>>(() => new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const today = useMemo(() => startOfToday(), [])

  // Clients used by at least one invoice, sorted alphabetically. Avoids
  // listing clients with no invoices in the dropdown.
  const clientOptions = useMemo(() => {
    const used = new Set(invoices.map((i) => i.clientId))
    return clients
      .filter((c) => used.has(c.id))
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [invoices, clients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const range = dateRangeFor(dateFilter, today)
    return invoices.filter((inv) => {
      const isOverdue = inv.status === 'sent' && new Date(inv.dueDate) < today

      if (statusFilter === 'overdue') {
        if (!isOverdue) return false
      } else if (statusFilter !== 'all') {
        if (inv.status !== statusFilter) return false
      }

      if (clientFilter !== 'all' && inv.clientId !== clientFilter) return false

      if (range) {
        const issued = new Date(inv.issueDate)
        if (issued < range.start || issued >= range.end) return false
      }

      if (q) {
        const inNumber = inv.number.toLowerCase().includes(q)
        const inClient = inv.clientName.toLowerCase().includes(q)
        if (!inNumber && !inClient) return false
      }

      return true
    })
  }, [invoices, search, statusFilter, clientFilter, dateFilter, today])

  const filtersActive =
    search.trim() !== '' || statusFilter !== 'all' || clientFilter !== 'all' || dateFilter !== 'all'

  // Filter changes reset to page 1 so the user is never stranded on an empty
  // page after narrowing results.
  function changeSearch(v: string) {
    setSearch(v)
    setPage(1)
  }
  function changeStatus(v: StatusFilter) {
    setStatusFilter(v)
    setPage(1)
  }
  function changeClient(v: string) {
    setClientFilter(v)
    setPage(1)
  }
  function changeDate(v: DatePreset) {
    setDateFilter(v)
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setClientFilter('all')
    setDateFilter('all')
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const pageEnd = Math.min(pageStart + PAGE_SIZE, filtered.length)
  const pageRows = filtered.slice(pageStart, pageEnd)

  // Derived: only rows still in the filtered view count toward the action bar,
  // so narrowing the filter (or a delete refetch) doesn't inflate the count.
  // Raw state still holds the user's clicks, so widening the filter restores
  // them.
  const selectedIds = useMemo(() => {
    if (rawSelectedIds.size === 0) return rawSelectedIds
    const visibleIds = new Set(filtered.map((i) => i.id))
    const visibleSelected = new Set<string>()
    for (const id of rawSelectedIds) {
      if (visibleIds.has(id)) visibleSelected.add(id)
    }
    return visibleSelected.size === rawSelectedIds.size ? rawSelectedIds : visibleSelected
  }, [filtered, rawSelectedIds])

  const pageSelectedCount = pageRows.reduce((n, r) => n + (selectedIds.has(r.id) ? 1 : 0), 0)
  const allPageSelected = pageRows.length > 0 && pageSelectedCount === pageRows.length
  const somePageSelected = pageSelectedCount > 0 && !allPageSelected
  const headerCheckedState: boolean | 'indeterminate' = allPageSelected
    ? true
    : somePageSelected
      ? 'indeterminate'
      : false

  function toggleRow(id: string, checked: boolean) {
    setRawSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function togglePage(checked: boolean) {
    setRawSelectedIds((prev) => {
      const next = new Set(prev)
      for (const row of pageRows) {
        if (checked) next.add(row.id)
        else next.delete(row.id)
      }
      return next
    })
  }

  function clearSelection() {
    setRawSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setDeleting(true)
    try {
      await deleteInvoices({ data: { ids } })
      toast.success(ids.length === 1 ? 'Invoice deleted' : `${ids.length} invoices deleted`)
      setShowBulkDelete(false)
      clearSelection()
      await router.invalidate()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

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
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        {invoices.length > 0 && (
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="size-4" aria-hidden="true" />
              New invoice
            </Link>
          </Button>
        )}
      </div>

      {invoices.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">No invoices yet</p>
          <Button asChild className="mt-4">
            <Link to="/invoices/new">
              <Plus className="size-4" aria-hidden="true" />
              New invoice
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={search}
                onChange={(e) => changeSearch(e.target.value)}
                placeholder="Search by number or client"
                aria-label="Search invoices"
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => changeStatus(v as StatusFilter)}>
              <SelectTrigger aria-label="Filter by status" className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="void">Void</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={clientFilter}
              onValueChange={changeClient}
              disabled={clientOptions.length === 0}
            >
              <SelectTrigger aria-label="Filter by client" className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clients</SelectItem>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(v) => changeDate(v as DatePreset)}>
              <SelectTrigger aria-label="Filter by date" className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="this-month">This month</SelectItem>
                <SelectItem value="last-month">Last month</SelectItem>
                <SelectItem value="this-quarter">This quarter</SelectItem>
                <SelectItem value="this-year">This year</SelectItem>
                <SelectItem value="last-year">Last year</SelectItem>
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-4" aria-hidden="true" />
                Clear
              </Button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="mt-12 flex flex-col items-center justify-center text-center">
              <p className="text-muted-foreground">No invoices match your filters</p>
              <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                Clear filters
              </Button>
            </div>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <div
                  role="region"
                  aria-label="Bulk actions"
                  className="mt-4 flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
                >
                  <p className="text-sm">
                    <span className="font-medium">{selectedIds.size}</span>
                    <span className="text-muted-foreground">
                      {selectedIds.size === 1 ? ' invoice selected' : ' invoices selected'}
                    </span>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={clearSelection}>
                      Clear
                    </Button>
                    <Button
                      variant="destructiveOutline"
                      size="sm"
                      onClick={() => setShowBulkDelete(true)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <Table>
                  <TableCaption className="sr-only">Invoices</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[36px]">
                        <Checkbox
                          checked={headerCheckedState}
                          onCheckedChange={(c) => togglePage(c === true)}
                          aria-label={
                            allPageSelected
                              ? 'Deselect all invoices on this page'
                              : 'Select all invoices on this page'
                          }
                        />
                      </TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Issued</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRows.map((inv) => {
                      const isOverdue = inv.status === 'sent' && new Date(inv.dueDate) < today
                      const isSelected = selectedIds.has(inv.id)
                      return (
                        <TableRow
                          key={inv.id}
                          data-state={isSelected ? 'selected' : undefined}
                          className={inv.status === 'void' ? 'line-through opacity-60' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(c) => toggleRow(inv.id, c === true)}
                              aria-label={`Select invoice ${inv.number}`}
                            />
                          </TableCell>
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
                            {formatDate(inv.issueDate)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(inv.dueDate)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatMoney(inv.totalCents, currency)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={inv.status} overdue={isOverdue} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" asChild>
                              <Link to="/invoices/$invoiceId" params={{ invoiceId: inv.id }}>
                                View
                                <span className="sr-only"> invoice {inv.number}</span>
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              <Pagination
                page={safePage}
                pageSize={PAGE_SIZE}
                totalRows={filtered.length}
                totalPages={totalPages}
                onChange={setPage}
              />
            </>
          )}

          <Dialog
            open={showBulkDelete}
            onOpenChange={(open) => !open && !deleting && setShowBulkDelete(false)}
          >
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>
                  {selectedIds.size === 1
                    ? 'Delete this invoice?'
                    : `Delete ${selectedIds.size} invoices?`}
                </DialogTitle>
                <DialogDescription>
                  This will remove the selected{' '}
                  {selectedIds.size === 1
                    ? 'invoice and its line items'
                    : 'invoices and their line items'}{' '}
                  permanently. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowBulkDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Delete'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}

function Pagination({
  page,
  pageSize,
  totalRows,
  totalPages,
  onChange,
}: {
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
  onChange: (p: number) => void
}) {
  const start = totalRows === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalRows)
  const items = pageItems(page, totalPages)

  return (
    <nav
      aria-label="Invoice pagination"
      className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"
    >
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {totalRows}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Previous
          </Button>
          {items.map((it, idx) =>
            it === 'gap' ? (
              <span
                key={`gap-${idx}`}
                aria-hidden="true"
                className="px-2 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={it}
                variant={it === page ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onChange(it)}
                aria-label={`Page ${it}`}
                aria-current={it === page ? 'page' : undefined}
                className="min-w-9"
              >
                {it}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            aria-label="Next page"
          >
            Next
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </nav>
  )
}
