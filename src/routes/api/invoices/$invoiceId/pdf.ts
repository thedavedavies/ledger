import { createFileRoute } from '@tanstack/react-router'
import {
  CompanyProfileMissingError,
  loadInvoiceData,
  renderInvoicePdf,
  PdfRenderTimeoutError,
  TooManyRequestsError,
} from '#/server/pdf/render'

export const Route = createFileRoute('/api/invoices/$invoiceId/pdf')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const invoiceId = params.invoiceId as string

        let data: Awaited<ReturnType<typeof loadInvoiceData>>
        try {
          data = await loadInvoiceData(invoiceId)
        } catch (err) {
          if (err instanceof CompanyProfileMissingError) {
            return new Response(err.message, { status: 409 })
          }
          throw err
        }
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
          if (err instanceof PdfRenderTimeoutError) {
            return new Response('PDF render timed out', { status: 504 })
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
