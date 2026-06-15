import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { InvoiceForm } from '#/components/InvoiceForm'
import { addDaysToDateOnly, localDateToDateOnly } from '#/lib/date-only'
import { listClients } from '#/server/clients.fn'
import { getCompanyProfile } from '#/server/settings.fn'
import { createInvoice } from '#/server/invoices.fn'

export const Route = createFileRoute('/invoices/new')({
  head: () => ({ meta: [{ title: 'New invoice · Ledger' }] }),
  loader: async () => {
    const [clients, profile] = await Promise.all([listClients(), getCompanyProfile()])
    return { clients, profile }
  },
  component: NewInvoicePage,
})

function todayString() {
  return localDateToDateOnly()
}

function plus30Days(issueDate: string) {
  return addDaysToDateOnly(issueDate, 30)
}

function NewInvoicePage() {
  const { clients, profile } = Route.useLoaderData()
  const navigate = useNavigate()
  const currency = profile.defaultCurrency || 'USD'
  const issueDate = todayString()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
      <p className="mt-1 text-sm text-muted-foreground">Create a new invoice for a client.</p>

      <InvoiceForm
        defaultValues={{
          clientId: '',
          title: '',
          poNumber: '',
          issueDate,
          dueDate: plus30Days(issueDate),
          taxRate: profile.taxRate || '0',
          notes: '',
          lineItems: [{ description: '', quantity: '1', unitPrice: '', per: '' }],
        }}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        currency={currency}
        submitLabel="Create invoice"
        onSubmit={async (data) => {
          try {
            const result = await createInvoice({ data })
            if (!result.success) {
              toast.error(result.error)
              return
            }
            toast.success('Invoice created')
            await navigate({
              to: '/invoices/$invoiceId',
              params: { invoiceId: result.invoice.id },
            })
          } catch {
            toast.error('Something went wrong. Please try again.')
          }
        }}
      />
    </div>
  )
}
