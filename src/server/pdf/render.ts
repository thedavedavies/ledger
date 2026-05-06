import path from 'node:path'
import fs from 'node:fs'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { eq } from 'drizzle-orm'
import { db } from '#/server/db'
import {
  invoice,
  invoiceLineItem,
  client,
  companyProfile,
} from '#/server/schema'
import { InvoiceTemplate } from './invoice-template'
import type { InvoiceTemplateProps } from './invoice-template'

const PDF_RENDER_CONCURRENCY = Math.max(
  1,
  Number(process.env['PDF_RENDER_CONCURRENCY']) || 4,
)
const MAX_QUEUE = 16

let active = 0
const waiting: Array<{
  resolve: () => void
  reject: (err: Error) => void
}> = []

async function acquireSemaphore(): Promise<void> {
  if (active < PDF_RENDER_CONCURRENCY) {
    active++
    return
  }
  if (waiting.length >= MAX_QUEUE) {
    throw new TooManyRequestsError()
  }
  return new Promise<void>((resolve, reject) => {
    waiting.push({ resolve, reject })
  })
}

function releaseSemaphore(): void {
  const next = waiting.shift()
  if (next) {
    next.resolve()
  } else {
    active--
  }
}

export class TooManyRequestsError extends Error {
  constructor() {
    super('Too many concurrent PDF renders')
  }
}

const UPLOADS_DIR = path.resolve(process.env['UPLOADS_DIR'] || 'uploads')

function resolveLogoPath(logoPath: string | null): string | null {
  if (!logoPath) return null
  const filename = path.basename(logoPath)
  const resolved = path.resolve(UPLOADS_DIR, filename)
  if (!resolved.startsWith(UPLOADS_DIR + path.sep)) {
    console.warn(`Logo path traversal blocked: ${logoPath}`)
    return null
  }
  try {
    fs.accessSync(resolved, fs.constants.R_OK)
    return resolved
  } catch {
    console.warn(`Logo file not readable: ${resolved}`)
    return null
  }
}

export async function loadInvoiceData(invoiceId: string): Promise<{
  props: InvoiceTemplateProps
  invoiceNumber: string
} | null> {
  const inv = await db
    .select()
    .from(invoice)
    .where(eq(invoice.id, invoiceId))
    .then((rows) => rows[0] ?? null)

  if (!inv) return null

  const [clientRow, lineItems, profile] = await Promise.all([
    db
      .select()
      .from(client)
      .where(eq(client.id, inv.clientId))
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(invoiceLineItem)
      .where(eq(invoiceLineItem.invoiceId, invoiceId))
      .orderBy(invoiceLineItem.sortOrder),
    db
      .select()
      .from(companyProfile)
      .where(eq(companyProfile.id, 1))
      .then((rows) => rows[0]!),
  ])

  const logoSrc = resolveLogoPath(profile.logoPath)

  const props: InvoiceTemplateProps = {
    invoice: {
      number: inv.number,
      status: inv.status,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      taxRate: inv.taxRate,
      subtotalCents: inv.subtotalCents,
      taxCents: inv.taxCents,
      totalCents: inv.totalCents,
      notes: inv.notes,
    },
    lineItems: lineItems.map((li) => ({
      id: li.id,
      description: li.description,
      quantity: li.quantity,
      unitPriceCents: li.unitPriceCents,
      lineTotalCents: li.lineTotalCents,
    })),
    client: clientRow
      ? {
          name: clientRow.name,
          email: clientRow.email,
          address: clientRow.address,
          city: clientRow.city,
          postcode: clientRow.postcode,
          country: clientRow.country,
        }
      : null,
    company: {
      businessName: profile.businessName,
      address: profile.address,
      city: profile.city,
      postcode: profile.postcode,
      country: profile.country,
      email: profile.email,
      phone: profile.phone,
      taxId: profile.taxId,
      defaultCurrency: profile.defaultCurrency,
    },
    logoSrc,
  }

  return { props, invoiceNumber: inv.number }
}

export async function renderInvoicePdf(
  props: InvoiceTemplateProps,
): Promise<Buffer> {
  await acquireSemaphore()
  try {
    const element = InvoiceTemplate(
      props,
    ) as React.ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)
    return Buffer.from(buffer)
  } finally {
    releaseSemaphore()
  }
}
