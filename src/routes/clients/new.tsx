import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { ClientForm } from '#/components/ClientForm'
import { createClient } from '#/server/clients.fn'

export const Route = createFileRoute('/clients/new')({
  head: () => ({ meta: [{ title: 'New client · Ledger' }] }),
  component: NewClientPage,
})

function NewClientPage() {
  const navigate = useNavigate()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">New client</h1>
      <p className="mt-1 text-sm text-muted-foreground">Add a new client to your account.</p>

      <ClientForm
        defaultValues={{
          name: '',
          companyName: '',
          email: '',
          address: '',
          city: '',
          postcode: '',
          country: '',
          phone: '',
          notes: '',
        }}
        submitLabel="Create client"
        onSubmit={async (data) => {
          try {
            await createClient({ data })
            toast.success('Client created')
            await navigate({ to: '/clients' })
          } catch {
            toast.error('Something went wrong. Please try again.')
          }
        }}
      />
    </div>
  )
}
