import { useState } from 'react'
import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Download, Printer } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatMoney } from '#/lib/money'
import { getCompanyProfile } from '#/server/settings.fn'
import {
  getInvoice,
  deleteInvoice,
  updateInvoiceStatus,
} from '#/server/invoices.fn'
import type { InvoiceStatus } from '#/server/schema'

export const Route = createFileRoute('/invoices/$invoiceId')({
  loader: async ({ params }) => {
    const [inv, profile] = await Promise.all([
      getInvoice({ data: { id: params.invoiceId } }),
      getCompanyProfile(),
    ])
    return { invoice: inv, profile }
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
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function InvoiceViewPage() {
  const { invoice: inv, profile } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!inv) return <InvoiceNotFound />

  const currency = profile.defaultCurrency || 'USD'

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

  return (
    <div className="print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {inv.number}
            </h1>
            <span className={`status-pill ${STATUS_STYLES[inv.status]}`}>
              {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {inv.client?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={inv.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue
                placeholder={
                  inv.status.charAt(0).toUpperCase() + inv.status.slice(1)
                }
              />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" asChild>
            <Link
              to="/invoices/$invoiceId/edit"
              params={{ invoiceId: inv.id }}
            >
              Edit
            </Link>
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            Delete
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`/api/invoices/${inv.id}/pdf`}
              download={`${inv.number}.pdf`}
            >
              <Download className="size-4" />
              Download PDF
            </a>
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              From
            </h3>
            <div className="mt-1 text-sm">
              <p className="font-medium">{profile.businessName || '—'}</p>
              {profile.address && <p>{profile.address}</p>}
              {(profile.city || profile.postcode) && (
                <p>
                  {[profile.city, profile.postcode].filter(Boolean).join(', ')}
                </p>
              )}
              {profile.country && <p>{profile.country}</p>}
              {profile.email && <p>{profile.email}</p>}
              {profile.taxId && <p>Tax ID: {profile.taxId}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Bill to
            </h3>
            <div className="mt-1 text-sm">
              <p className="font-medium">{inv.client?.name || '—'}</p>
              {inv.client?.address && <p>{inv.client.address}</p>}
              {(inv.client?.city || inv.client?.postcode) && (
                <p>
                  {[inv.client.city, inv.client.postcode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
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
                  <TableCell className="text-right tabular-nums">
                    {li.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(li.unitPriceCents, currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(li.lineTotalCents, currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">
                {formatMoney(inv.subtotalCents, currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Tax{Number(inv.taxRate) > 0 ? ` ${inv.taxRate}%` : ''}
              </span>
              <span className="tabular-nums">
                {formatMoney(inv.taxCents, currency)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">
                {formatMoney(inv.totalCents, currency)}
              </span>
            </div>
          </div>
        </div>

        {inv.notes && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">
              Notes
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm">{inv.notes}</p>
          </div>
        )}
      </div>

      <Dialog
        open={showDelete}
        onOpenChange={(open) => !open && setShowDelete(false)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete invoice {inv.number}?</DialogTitle>
            <DialogDescription>
              This will remove the invoice and all line items permanently. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete'}
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
      <h1 className="text-2xl font-semibold tracking-tight">
        Invoice not found
      </h1>
      <p className="mt-2 text-muted-foreground">
        The invoice you&apos;re looking for doesn&apos;t exist or has been
        deleted.
      </p>
    </div>
  )
}
