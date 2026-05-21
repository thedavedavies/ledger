import { useState } from 'react'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Download, MoreHorizontal, Pencil, Plus, Send, X } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { IconButton } from '#/components/ui/icon-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { RecordPaymentDialog } from '#/components/RecordPaymentDialog'
import { formatDateOnly } from '#/lib/date-only'
import { buildInvoiceActivity } from '#/lib/invoice-activity'
import { formatMoney } from '#/lib/money'
import { timeAgo } from '#/lib/time-ago'
import { getCompanyProfile } from '#/server/settings.fn'
import { getInvoice, deleteInvoice, updateInvoiceStatus } from '#/server/invoices.fn'
import { listPayments, deletePayment } from '#/server/payments.fn'
import type { InvoiceStatus } from '#/server/schema'

export const Route = createFileRoute('/invoices/$invoiceId/')({
  head: () => ({ meta: [{ title: 'Invoice · Ledger' }] }),
  loader: async ({ params }) => {
    const [inv, profile, payments] = await Promise.all([
      getInvoice({ data: { id: params.invoiceId } }),
      getCompanyProfile(),
      listPayments({ data: { invoiceId: params.invoiceId } }),
    ])
    return { invoice: inv, profile, payments }
  },
  component: InvoiceViewPage,
  notFoundComponent: InvoiceNotFound,
})

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'status-draft',
  sent: 'status-sent',
  paid: 'status-paid',
  void: 'status-void',
}

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'paid', 'void']

function formatDate(date: string | Date): string {
  return formatDateOnly(date)
}

function InvoiceViewPage() {
  const { invoice: inv, profile, payments } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null)
  const [showRecordPayment, setShowRecordPayment] = useState(false)
  const [sending, setSending] = useState(false)

  if (!inv) return <InvoiceNotFound />

  const currency = profile.defaultCurrency || 'USD'
  const fmt = (cents: bigint) => formatMoney(cents, currency)

  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0n)
  const balanceDueCents = inv.totalCents - paidCents
  const isFullyPaid = paidCents >= inv.totalCents && inv.totalCents > 0n
  const isPartiallyPaid = paidCents > 0n && paidCents < inv.totalCents

  async function handleDelete() {
    if (!inv) return
    setDeleting(true)
    try {
      await deleteInvoice({ data: { id: inv.id } })
      toast.success('Invoice deleted')
      await navigate({ to: '/' })
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  async function handleStatusChange(status: string) {
    if (!inv) return
    try {
      await updateInvoiceStatus({
        data: { id: inv.id, status: status as InvoiceStatus },
      })
      toast.success(`Status updated to ${status}`)
      await router.invalidate()
    } catch {
      toast.error('Failed to update status')
    }
  }

  function downloadPdf() {
    if (!inv) return
    const a = document.createElement('a')
    a.href = `/api/invoices/${inv.id}/pdf`
    a.download = `${inv.number}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  // Combo action: flips draft to sent (skipped if already sent), then triggers
  // PDF download so the user can email it manually until SMTP lands.
  async function handleSend() {
    if (!inv) return
    setSending(true)
    try {
      if (inv.status === 'draft') {
        await updateInvoiceStatus({
          data: { id: inv.id, status: 'sent' },
        })
      }
      downloadPdf()
      await router.invalidate()
      toast.success('Invoice sent. PDF downloaded.')
    } catch {
      toast.error('Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  async function handleDeletePayment(id: string) {
    try {
      await deletePayment({ data: { id } })
      toast.success('Payment removed')
      setDeletePaymentId(null)
      await router.invalidate()
    } catch {
      toast.error('Could not remove payment.')
    }
  }

  return (
    <div className="print:p-0">
      <div className="flex items-start justify-between gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-normal tracking-tight">{inv.number}</h1>
            <span className={`status-pill ${STATUS_STYLES[inv.status]}`}>
              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
            </span>
            {isPartiallyPaid && <span className="status-pill status-overdue">Partially paid</span>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{inv.client?.name}</p>
        </div>
        <div className="flex items-center justify-end gap-2">
          {inv.status === 'draft' && (
            <Button
              onClick={handleSend}
              disabled={sending}
              aria-busy={sending || undefined}
            >
              <Send className="size-4" aria-hidden="true" />
              {sending ? 'Sending…' : 'Send'}
            </Button>
          )}
          {(inv.status === 'sent' || inv.status === 'paid') && balanceDueCents > 0n && (
            <Button onClick={() => setShowRecordPayment(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Record payment
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More actions">
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem asChild>
                <Link to="/invoices/$invoiceId/edit" params={{ invoiceId: inv.id }}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={downloadPdf}>
                <Download className="size-4" aria-hidden="true" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Change status</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={inv.status} onValueChange={handleStatusChange}>
                    {STATUSES.map((s) => (
                      <DropdownMenuRadioItem key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setShowDelete(true)}>
                <X className="size-4" aria-hidden="true" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-[1fr_260px] gap-8 print:block">
        {/* Doc column */}
        <div className="space-y-8">
          <h2 className="sr-only">Invoice details</h2>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                From
              </h3>
              <div className="mt-1 text-sm">
                <p className="font-medium">{profile.businessName || '-'}</p>
                {profile.address && <p>{profile.address}</p>}
                {(profile.city || profile.postcode) && (
                  <p>{[profile.city, profile.postcode].filter(Boolean).join(', ')}</p>
                )}
                {profile.country && <p>{profile.country}</p>}
                {profile.email && <p>{profile.email}</p>}
                {profile.taxId && <p>Tax ID: {profile.taxId}</p>}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                Bill to
              </h3>
              <div className="mt-1 text-sm">
                <p className="font-medium">{inv.client?.name || '-'}</p>
                {inv.client?.address && <p>{inv.client.address}</p>}
                {(inv.client?.city || inv.client?.postcode) && (
                  <p>{[inv.client.city, inv.client.postcode].filter(Boolean).join(', ')}</p>
                )}
                {inv.client?.country && <p>{inv.client.country}</p>}
                {inv.client?.email && <p>{inv.client.email}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Issue date</span>
              <p className="font-medium">{formatDate(inv.issueDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Due date</span>
              <p className="font-medium">{formatDate(inv.dueDate)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Invoice number</span>
              <p className="font-medium">{inv.number}</p>
            </div>
          </div>

          <div>
            <Table>
              <TableCaption className="sr-only">Line items</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inv.lineItems.map((li) => (
                  <TableRow key={li.id}>
                    <TableCell>{li.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{li.quantity}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(li.unitPriceCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(li.lineTotalCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end">
            <div className="w-72 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-serif text-[14px]">
                  {fmt(inv.subtotalCents)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Tax{Number(inv.taxRate) > 0 ? ` ${inv.taxRate}%` : ''}
                </span>
                <span className="tabular-nums font-serif text-[14px]">{fmt(inv.taxCents)}</span>
              </div>
              <div className="flex justify-between border-t border-foreground pt-2.5">
                <span className="text-[14px] font-semibold">Total</span>
                <span className="tabular-nums font-serif text-[24px] tracking-tight">
                  {fmt(inv.totalCents)}
                </span>
              </div>
              {paidCents > 0n && (
                <>
                  <div className="flex justify-between border-t border-border pt-2.5">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ background: 'var(--color-status-paid)' }}
                      />
                      Paid
                    </span>
                    <span
                      className="tabular-nums font-serif text-[14px]"
                      style={{ color: 'var(--color-status-paid)' }}
                    >
                      −{fmt(paidCents)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[14px] font-semibold">Balance due</span>
                    <span className="tabular-nums font-serif text-[24px] tracking-tight">
                      {fmt(balanceDueCents)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payments received */}
          <div className="rounded-md border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                  Payments received
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {payments.length === 0
                    ? 'None recorded'
                    : `${payments.length} payment${payments.length === 1 ? '' : 's'} · ${fmt(paidCents)} of ${fmt(inv.totalCents)}`}
                </p>
              </div>
              {balanceDueCents > 0n && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[var(--color-accent)]"
                  onClick={() => setShowRecordPayment(true)}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Record payment
                </Button>
              )}
            </div>

            {payments.length > 0 && (
              <div className="mt-4 divide-y divide-border">
                <div className="grid grid-cols-[110px_1fr_120px_32px] gap-4 pb-2 text-[10px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                  <span>Date</span>
                  <span>Method / Reference</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-[110px_1fr_120px_32px] items-center gap-4 py-3 text-sm"
                  >
                    <span>{formatDate(p.paidAt)}</span>
                    <div>
                      <p className="text-foreground">{p.method || '-'}</p>
                      {(p.reference || p.notes) && (
                        <p className="text-xs text-muted-foreground">
                          {[p.reference, p.notes].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <span className="text-right tabular-nums font-serif">{fmt(p.amountCents)}</span>
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      label={`Remove payment of ${fmt(p.amountCents)} on ${formatDate(p.paidAt)}`}
                      onClick={() => setDeletePaymentId(p.id)}
                      className="ml-auto h-8 w-8 cursor-pointer p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}

            {isFullyPaid && (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-status-paid)' }}>
                ● Invoice fully paid.
              </p>
            )}
          </div>

          {inv.notes && (
            <div>
              <h3 className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground">
                Notes
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm">{inv.notes}</p>
            </div>
          )}
        </div>

        {/* Activity sidebar */}
        <aside aria-labelledby="activity-heading" className="space-y-3 print:hidden">
          <h2
            id="activity-heading"
            className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground"
          >
            Activity
          </h2>
          <div className="border-t border-border pt-4">
            <ul className="relative space-y-4 pl-4">
              <span aria-hidden className="absolute top-2 bottom-2 left-[3px] w-px bg-border" />
              {buildInvoiceActivity(inv, payments, fmt).map((event, i) => (
                <li key={i} className="relative">
                  <span
                    aria-hidden
                    className="absolute -left-4 top-1.5 size-1.5 rounded-full bg-foreground"
                  />
                  <p className="text-[11px] text-muted-foreground">{timeAgo(event.at)}</p>
                  <p className="text-[13px] text-foreground">{event.label}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <RecordPaymentDialog
        invoiceId={inv.id}
        invoiceNumber={inv.number}
        clientName={inv.client?.name ?? null}
        balanceDueCents={balanceDueCents}
        formatCents={fmt}
        open={showRecordPayment}
        onOpenChange={setShowRecordPayment}
      />

      <Dialog open={showDelete} onOpenChange={(open) => !open && setShowDelete(false)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete invoice {inv.number}?</DialogTitle>
            <DialogDescription>
              This will remove the invoice and all line items permanently. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePaymentId} onOpenChange={(open) => !open && setDeletePaymentId(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove payment?</DialogTitle>
            <DialogDescription>
              This will remove the payment record permanently. The invoice balance will be
              recalculated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePaymentId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletePaymentId && handleDeletePayment(deletePaymentId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InvoiceNotFound() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Invoice not found</h1>
      <p className="mt-2 text-muted-foreground">
        The invoice you&apos;re looking for doesn&apos;t exist or has been deleted.
      </p>
    </div>
  )
}
