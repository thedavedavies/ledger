import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { InvoiceForm } from '#/components/InvoiceForm'
import { listClients } from '#/server/clients.fn'
import { getCompanyProfile } from '#/server/settings.fn'
import { getInvoice, updateInvoice } from '#/server/invoices.fn'
import { utcDateToDateOnly } from '#/lib/date-only'
import { fromCents } from '#/lib/money'

export const Route = createFileRoute('/invoices/$invoiceId/edit')({
  head: () => ({ meta: [{ title: 'Edit invoice · Ledger' }] }),
  loader: async ({ params }) => {
    const [inv, clients, profile] = await Promise.all([
      getInvoice({ data: { id: params.invoiceId } }),
      listClients(),
      getCompanyProfile(),
    ])
    return { invoice: inv, clients, profile }
  },
  component: EditInvoicePage,
  notFoundComponent: InvoiceNotFound,
})

function toDateString(d: string | Date): string {
  return utcDateToDateOnly(d)
}

function EditInvoicePage() {
  const { invoice: inv, clients, profile } = Route.useLoaderData()
  const navigate = useNavigate()

  if (!inv) return <InvoiceNotFound />

  const currency = profile.defaultCurrency || 'USD'

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Edit {inv.number}</h1>
      <p className="mt-1 text-sm text-muted-foreground">Update invoice details and line items.</p>

      <InvoiceForm
        defaultValues={{
          clientId: inv.clientId,
          issueDate: toDateString(inv.issueDate),
          dueDate: toDateString(inv.dueDate),
          taxRate: inv.taxRate,
          notes: inv.notes,
          lineItems: inv.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: fromCents(li.unitPriceCents),
          })),
        }}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        currency={currency}
        submitLabel="Save changes"
        onSubmit={async (data) => {
          try {
            const result = await updateInvoice({ data: { id: inv.id, ...data } })
            if (!result.success) {
              toast.error(result.error)
              return
            }
            toast.success('Invoice updated')
            await navigate({
              to: '/invoices/$invoiceId',
              params: { invoiceId: inv.id },
            })
          } catch {
            toast.error('Something went wrong. Please try again.')
          }
        }}
      />
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
