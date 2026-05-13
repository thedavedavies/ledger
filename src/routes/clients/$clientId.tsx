import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ClientForm } from '#/components/ClientForm'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { deleteClient, getClient, updateClient } from '#/server/clients.fn'

export const Route = createFileRoute('/clients/$clientId')({
  loader: ({ params }) => getClient({ data: { id: params.clientId } }),
  component: EditClientPage,
  notFoundComponent: ClientNotFound,
})

function EditClientPage() {
  const clientData = Route.useLoaderData()
  const navigate = useNavigate()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!clientData) {
    return <ClientNotFound />
  }

  async function handleDelete() {
    if (!clientData) return
    setDeleting(true)
    try {
      const result = await deleteClient({ data: { id: clientData.id } })
      if (!result.success) {
        toast.error(result.error)
        setShowDelete(false)
        return
      }
      toast.success('Client deleted')
      await navigate({ to: '/clients' })
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit client</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update details for {clientData.name}.
          </p>
        </div>
        <Button
          variant="destructiveOutline"
          size="sm"
          onClick={() => setShowDelete(true)}
        >
          Delete client
        </Button>
      </div>

      <ClientForm
        defaultValues={{
          name: clientData.name,
          companyName: clientData.companyName,
          email: clientData.email,
          address: clientData.address,
          city: clientData.city,
          postcode: clientData.postcode,
          country: clientData.country,
          phone: clientData.phone,
          notes: clientData.notes,
        }}
        submitLabel="Save changes"
        onSubmit={async (data) => {
          try {
            await updateClient({ data: { id: clientData.id, ...data } })
            toast.success('Client updated')
            await navigate({ to: '/clients' })
          } catch {
            toast.error('Something went wrong. Please try again.')
          }
        }}
      />

      <Dialog
        open={showDelete}
        onOpenChange={(open) => !open && setShowDelete(false)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete client</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-medium text-foreground">
                {clientData.name}
              </span>
              ? This action cannot be undone.
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
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ClientNotFound() {
  return (
    <div className="mt-16 flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Client not found</h1>
      <p className="mt-2 text-muted-foreground">
        The client you're looking for doesn't exist or has been deleted.
      </p>
    </div>
  )
}
