import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ClientForm } from '#/components/ClientForm'
import { getClient, updateClient } from '#/server/clients.fn'

export const Route = createFileRoute('/clients/$clientId')({
  loader: ({ params }) => getClient({ data: { id: params.clientId } }),
  component: EditClientPage,
  notFoundComponent: ClientNotFound,
})

function EditClientPage() {
  const clientData = Route.useLoaderData()
  const navigate = useNavigate()

  if (!clientData) {
    return <ClientNotFound />
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Edit client</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Update details for {clientData.name}.
      </p>

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
