import { createFileRoute } from '@tanstack/react-router'
import { loadInvoiceData, renderInvoicePdf, TooManyRequestsError } from '#/server/pdf/render'

export const Route = createFileRoute('/api/invoices/$invoiceId/pdf')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const invoiceId = params.invoiceId as string

        const data = await loadInvoiceData(invoiceId)
        if (!data) {
          return new Response('Invoice not found', { status: 404 })
        }

        let buffer: Buffer
        try {
          buffer = await renderInvoicePdf(data.props)
        } catch (err) {
          if (err instanceof TooManyRequestsError) {
            return new Response('Too many requests', { status: 429 })
          }
          throw err
        }

        return new Response(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${data.invoiceNumber}.pdf"`,
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
  },
})
