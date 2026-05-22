import { createServerFn } from '@tanstack/react-start'
import { desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import { clientInput } from '#/lib/validators'
import { db } from './db'
import { client, invoice } from './schema'

export const listClients = createServerFn({ method: 'GET' }).handler(async () => {
  const rows = await db
    .select({
      id: client.id,
      name: client.name,
      companyName: client.companyName,
      email: client.email,
      phone: client.phone,
      invoiceCount: sql<number>`cast(count(${invoice.id}) as int)`,
      updatedAt: client.updatedAt,
    })
    .from(client)
    .leftJoin(invoice, eq(invoice.clientId, client.id))
    .groupBy(client.id)
    .orderBy(desc(client.updatedAt))

  return rows
})

export const getClient = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const row = await db
      .select()
      .from(client)
      .where(eq(client.id, data.id))
      .then((rows) => rows[0] ?? null)

    return row
  })

export const createClient = createServerFn({ method: 'POST' })
  .inputValidator(clientInput)
  .handler(async ({ data }) => {
    const [created] = await db
      .insert(client)
      .values({
        name: data.name,
        companyName: data.companyName,
        email: data.email,
        address: data.address,
        city: data.city,
        postcode: data.postcode,
        country: data.country,
        phone: data.phone,
        notes: data.notes,
      })
      .returning()

    if (!created) {
      throw new Error('Failed to create client')
    }

    return created
  })

export const updateClient = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }).merge(clientInput))
  .handler(async ({ data }) => {
    const { id, ...fields } = data
    const [updated] = await db
      .update(client)
      .set({
        ...fields,
        updatedAt: new Date(),
      })
      .where(eq(client.id, id))
      .returning()

    if (!updated) {
      throw new Error('Client not found')
    }

    return updated
  })

export const deleteClient = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(invoice)
      .where(eq(invoice.clientId, data.id))

    const invoiceCount = row?.count ?? 0
    if (invoiceCount > 0) {
      return {
        success: false as const,
        error: `Cannot delete: ${invoiceCount} invoice${invoiceCount === 1 ? '' : 's'} reference this client`,
      }
    }

    const [deleted] = await db.delete(client).where(eq(client.id, data.id)).returning()

    if (!deleted) {
      throw new Error('Client not found')
    }

    return { success: true as const }
  })

export const deleteClients = createServerFn({ method: 'POST' })
  .inputValidator(z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }))
  .handler(async ({ data }) => {
    // Find which of the requested clients still have invoices; those can't be
    // deleted because invoice.clientId has no ON DELETE CASCADE.
    const referencingRows = await db
      .selectDistinct({ clientId: invoice.clientId })
      .from(invoice)
      .where(inArray(invoice.clientId, data.ids))

    const blockedIds = new Set(referencingRows.map((r) => r.clientId))
    const deletableIds = data.ids.filter((id) => !blockedIds.has(id))

    let deletedCount = 0
    if (deletableIds.length > 0) {
      const deleted = await db
        .delete(client)
        .where(inArray(client.id, deletableIds))
        .returning({ id: client.id })
      deletedCount = deleted.length
    }

    return {
      success: true as const,
      deletedCount,
      skippedCount: blockedIds.size,
    }
  })
