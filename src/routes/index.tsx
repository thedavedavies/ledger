import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { formatMoney } from '#/lib/money'
import { getCompanyProfile } from '#/server/settings.fn'
import { deleteInvoice, listInvoices } from '#/server/invoices.fn'
import type { InvoiceStatus } from '#/server/schema'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [invoices, profile] = await Promise.all([
      listInvoices(),
      getCompanyProfile(),
    ])
    return { invoices, profile }
  },
  component: HomePage,
})

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: 'status-draft',
  sent: 'status-sent',
  paid: 'status-paid',
  void: 'status-void',
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={`status-pill ${STATUS_STYLES[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function HomePage() {
  const { invoices, profile } = Route.useLoaderData()
  const router = useRouter()
  const needsSetup = !profile.businessName
  const currency = profile.defaultCurrency || 'USD'

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    number: string
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteInvoice({ data: { id: deleteTarget.id } })
      toast.success('Invoice deleted')
      setDeleteTarget(null)
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
              <Plus className="size-4" />
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
              <Plus className="size-4" />
              New invoice
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className={inv.status === 'void' ? 'line-through opacity-60' : ''}
                >
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
                    <StatusBadge status={inv.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: inv.id }}
                        >
                          View
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteTarget({ id: inv.id, number: inv.number })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete invoice {deleteTarget?.number}?</DialogTitle>
            <DialogDescription>
              This will remove the invoice and all line items permanently. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
