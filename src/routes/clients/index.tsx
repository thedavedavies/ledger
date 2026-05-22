import { useEffect, useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
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
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { deleteClients, listClients } from '#/server/clients.fn'

export const Route = createFileRoute('/clients/')({
  head: () => ({ meta: [{ title: 'Clients · Ledger' }] }),
  loader: () => listClients(),
  component: ClientsListPage,
})

function ClientsListPage() {
  const clients = Route.useLoaderData()
  const router = useRouter()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Drop selections for rows that vanished (e.g. after a delete refetch).
  useEffect(() => {
    if (selectedIds.size === 0) return
    const visibleIds = new Set(clients.map((c) => c.id))
    let changed = false
    const next = new Set<string>()
    for (const id of selectedIds) {
      if (visibleIds.has(id)) next.add(id)
      else changed = true
    }
    if (changed) setSelectedIds(next)
  }, [clients, selectedIds])

  const selectedCount = selectedIds.size
  const allSelected = clients.length > 0 && selectedCount === clients.length
  const someSelected = selectedCount > 0 && !allSelected
  const headerCheckedState: boolean | 'indeterminate' = allSelected
    ? true
    : someSelected
      ? 'indeterminate'
      : false

  // How many selected clients have invoices (so we can warn before the
  // server fn skips them). Computed against the loader's invoiceCount.
  const blockedSelectedCount = clients.reduce(
    (n, c) => n + (selectedIds.has(c.id) && c.invoiceCount > 0 ? 1 : 0),
    0,
  )
  const deletableSelectedCount = selectedCount - blockedSelectedCount

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(() => {
      if (!checked) return new Set()
      return new Set(clients.map((c) => c.id))
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setDeleting(true)
    try {
      const result = await deleteClients({ data: { ids } })
      if (result.deletedCount === 0) {
        toast.error(
          result.skippedCount === 1
            ? 'Client has invoices and cannot be deleted.'
            : 'Selected clients have invoices and cannot be deleted.',
        )
      } else {
        const noun = result.deletedCount === 1 ? 'client' : 'clients'
        const msg =
          result.skippedCount > 0
            ? `${result.deletedCount} ${noun} deleted, ${result.skippedCount} skipped (has invoices)`
            : `${result.deletedCount} ${noun} deleted`
        toast.success(msg)
      }
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
        {clients.length > 0 && (
          <Button asChild>
            <Link to="/clients/new">
              <Plus className="size-4" aria-hidden="true" />
              New client
            </Link>
          </Button>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">No clients yet</p>
          <Button asChild className="mt-4">
            <Link to="/clients/new">
              <Plus className="size-4" aria-hidden="true" />
              New client
            </Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6">
          {selectedCount > 0 && (
            <div
              role="region"
              aria-label="Bulk actions"
              className="mb-4 flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2"
            >
              <p className="text-sm">
                <span className="font-medium">{selectedCount}</span>
                <span className="text-muted-foreground">
                  {selectedCount === 1 ? ' client selected' : ' clients selected'}
                </span>
                {blockedSelectedCount > 0 && (
                  <span className="ml-2 text-muted-foreground">
                    ({blockedSelectedCount} with invoices)
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
                <Button
                  variant="destructiveOutline"
                  size="sm"
                  onClick={() => setShowBulkDelete(true)}
                  disabled={deletableSelectedCount === 0}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
            </div>
          )}

          <Table>
            <TableCaption className="sr-only">Clients</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[36px]">
                  <Checkbox
                    checked={headerCheckedState}
                    onCheckedChange={(c) => toggleAll(c === true)}
                    aria-label={allSelected ? 'Deselect all clients' : 'Select all clients'}
                  />
                </TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
                <TableHead className="w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => {
                const isSelected = selectedIds.has(c.id)
                return (
                  <TableRow key={c.id} data-state={isSelected ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleRow(c.id, checked === true)}
                        aria-label={`Select client ${c.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link
                        to="/clients/$clientId"
                        params={{ clientId: c.id }}
                        className="hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{c.companyName || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email || '-'}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.invoiceCount}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/clients/$clientId" params={{ clientId: c.id }}>
                          Edit
                          <span className="sr-only"> {c.name}</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <Dialog
            open={showBulkDelete}
            onOpenChange={(open) => !open && !deleting && setShowBulkDelete(false)}
          >
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>
                  {deletableSelectedCount === 1
                    ? 'Delete this client?'
                    : `Delete ${deletableSelectedCount} clients?`}
                </DialogTitle>
                <DialogDescription>
                  {blockedSelectedCount > 0 ? (
                    <>
                      {deletableSelectedCount === 1
                        ? '1 client will be deleted'
                        : `${deletableSelectedCount} clients will be deleted`}
                      ; {blockedSelectedCount} will be skipped because they have invoices. This
                      cannot be undone.
                    </>
                  ) : (
                    'This will permanently remove the selected clients. This cannot be undone.'
                  )}
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
