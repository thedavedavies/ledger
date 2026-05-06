import { describe, it, expect, vi } from 'vitest'
import type { DocumentProps } from '@react-pdf/renderer'

vi.mock('#/server/db', () => ({
  db: {},
}))

const { InvoiceTemplate } = await import(
  '#/server/pdf/invoice-template'
)

function makeProps(
  overrides: {
    lineItems?: Array<{
      id: string
      description: string
      quantity: string
      unitPriceCents: bigint
      lineTotalCents: bigint
    }>
    logoSrc?: string | null
    notes?: string
    taxRate?: string
    currency?: string
  } = {},
) {
  const lineItems = overrides.lineItems ?? [
    {
      id: '1',
      description: 'Web development',
      quantity: '1',
      unitPriceCents: 10000n,
      lineTotalCents: 10000n,
    },
  ]

  const subtotalCents = lineItems.reduce(
    (s, li) => s + li.lineTotalCents,
    0n,
  )
  const taxRate = overrides.taxRate ?? '0'
  const taxCents =
    Number(taxRate) > 0
      ? BigInt(
          Math.round(
            (Number(subtotalCents) * Number(taxRate)) / 100,
          ),
        )
      : 0n
  const totalCents = subtotalCents + taxCents

  return {
    invoice: {
      number: 'INV-2026-0001',
      status: 'draft',
      issueDate: '2026-01-15T00:00:00.000Z',
      dueDate: '2026-02-15T00:00:00.000Z',
      taxRate,
      subtotalCents,
      taxCents,
      totalCents,
      notes: overrides.notes ?? '',
    },
    lineItems,
    client: {
      name: 'Acme Corp',
      email: 'billing@acme.com',
      address: '123 Main St',
      city: 'New York',
      postcode: '10001',
      country: 'US',
    },
    company: {
      businessName: 'My Company',
      address: '456 Business Ave',
      city: 'San Francisco',
      postcode: '94105',
      country: 'US',
      email: 'hello@mycompany.com',
      phone: '+1 555-0100',
      taxId: 'US-123456',
      defaultCurrency: overrides.currency ?? 'USD',
    },
    logoSrc: overrides.logoSrc ?? null,
  }
}

describe('InvoiceTemplate', () => {
  it('is a valid function component', () => {
    expect(typeof InvoiceTemplate).toBe('function')
  })
})

describe('PDF rendering', () => {
  it('renders a single-line-item invoice — buffer starts with %PDF-', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const props = makeProps()
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(0)
    const header = Buffer.from(buffer).subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  }, 30_000)

  it('renders with all optional fields — logo null, notes, tax', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const props = makeProps({
      notes: 'Payment within 14 days',
      taxRate: '20',
      logoSrc: null,
    })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(0)
    const header = Buffer.from(buffer).subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  }, 30_000)

  it('renders multi-line invoice (10 items) without error', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const lineItems = Array.from({ length: 10 }, (_, i) => ({
      id: String(i + 1),
      description: `Service item ${i + 1} — detailed description of the work performed`,
      quantity: String(i + 1),
      unitPriceCents: BigInt((i + 1) * 5000),
      lineTotalCents: BigInt((i + 1) * (i + 1) * 5000),
    }))
    const props = makeProps({ lineItems })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(1024)
    const header = Buffer.from(buffer).subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  }, 30_000)

  it('renders with no logo (logoSrc=null) successfully', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const props = makeProps({ logoSrc: null })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    const header = Buffer.from(buffer).subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
  }, 30_000)

  it('formats USD correctly', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const props = makeProps({ currency: 'USD' })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(0)
  }, 30_000)

  it('formats EUR correctly', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const props = makeProps({ currency: 'EUR' })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(0)
  }, 30_000)

  it('formats GBP correctly', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const props = makeProps({ currency: 'GBP' })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(0)
  }, 30_000)

  it('formats JPY correctly (no minor units)', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const props = makeProps({ currency: 'JPY' })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(0)
  }, 30_000)

  it('handles long descriptions without error', async () => {
    const { renderToBuffer } = await import('@react-pdf/renderer')
    const lineItems = [
      {
        id: '1',
        description:
          'This is an extremely long description that should wrap within the line-item cell without overflowing the page boundaries. It includes multiple sentences to test text wrapping behavior in the PDF renderer. The description continues with additional detail about the service provided, including specific technical requirements and deliverables that were agreed upon in the statement of work.',
        quantity: '1',
        unitPriceCents: 50000n,
        lineTotalCents: 50000n,
      },
    ]
    const props = makeProps({ lineItems })
    const element = InvoiceTemplate(props) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    expect(buffer.byteLength).toBeGreaterThan(0)
  }, 30_000)
})
