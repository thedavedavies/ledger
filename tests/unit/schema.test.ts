import { describe, expect, it } from 'vitest'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { companyProfile, client, invoice, invoiceLineItem, numberSequence } from '#/server/schema'

describe('schema definitions', () => {
  it('companyProfile table has expected columns', () => {
    expect(getTableName(companyProfile)).toBe('company_profile')
    const cols = getTableColumns(companyProfile)
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('businessName')
    expect(cols).toHaveProperty('address')
    expect(cols).toHaveProperty('defaultCurrency')
    expect(cols).toHaveProperty('taxRate')
    expect(cols).toHaveProperty('createdAt')
    expect(cols).toHaveProperty('updatedAt')
  })

  it('client table has expected columns', () => {
    expect(getTableName(client)).toBe('client')
    const cols = getTableColumns(client)
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('name')
    expect(cols).toHaveProperty('email')
    expect(cols).toHaveProperty('address')
    expect(cols).toHaveProperty('city')
    expect(cols).toHaveProperty('postcode')
    expect(cols).toHaveProperty('country')
    expect(cols).toHaveProperty('phone')
    expect(cols).toHaveProperty('createdAt')
    expect(cols).toHaveProperty('updatedAt')
  })

  it('invoice table has expected columns', () => {
    expect(getTableName(invoice)).toBe('invoice')
    const cols = getTableColumns(invoice)
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('number')
    expect(cols).toHaveProperty('clientId')
    expect(cols).toHaveProperty('status')
    expect(cols).toHaveProperty('issueDate')
    expect(cols).toHaveProperty('dueDate')
    expect(cols).toHaveProperty('taxRate')
    expect(cols).toHaveProperty('subtotalCents')
    expect(cols).toHaveProperty('taxCents')
    expect(cols).toHaveProperty('totalCents')
    expect(cols).toHaveProperty('notes')
    expect(cols).toHaveProperty('createdAt')
    expect(cols).toHaveProperty('updatedAt')
  })

  it('invoiceLineItem table has expected columns', () => {
    expect(getTableName(invoiceLineItem)).toBe('invoice_line_item')
    const cols = getTableColumns(invoiceLineItem)
    expect(cols).toHaveProperty('id')
    expect(cols).toHaveProperty('invoiceId')
    expect(cols).toHaveProperty('description')
    expect(cols).toHaveProperty('quantity')
    expect(cols).toHaveProperty('unitPriceCents')
    expect(cols).toHaveProperty('lineTotalCents')
    expect(cols).toHaveProperty('per')
    expect(cols).toHaveProperty('sortOrder')
    expect(cols).toHaveProperty('createdAt')
    expect(cols).toHaveProperty('updatedAt')
  })

  it('numberSequence table has expected columns', () => {
    expect(getTableName(numberSequence)).toBe('number_sequence')
    const cols = getTableColumns(numberSequence)
    expect(cols).toHaveProperty('year')
    expect(cols).toHaveProperty('lastValue')
  })

  it('money columns use bigint type', () => {
    const invoiceCols = getTableColumns(invoice)
    expect(invoiceCols.subtotalCents.columnType).toBe('PgBigInt64')
    expect(invoiceCols.taxCents.columnType).toBe('PgBigInt64')
    expect(invoiceCols.totalCents.columnType).toBe('PgBigInt64')

    const lineCols = getTableColumns(invoiceLineItem)
    expect(lineCols.unitPriceCents.columnType).toBe('PgBigInt64')
    expect(lineCols.lineTotalCents.columnType).toBe('PgBigInt64')
  })

  it('quantity column uses numeric type', () => {
    const cols = getTableColumns(invoiceLineItem)
    expect(cols.quantity.columnType).toBe('PgNumeric')
  })
})

describe('db.ts DATABASE_URL validation', () => {
  it('throws if DATABASE_URL is missing', async () => {
    const original = process.env['DATABASE_URL']
    delete process.env['DATABASE_URL']
    try {
      await expect(
        import('#/server/db').catch((e: unknown) => {
          throw e
        }),
      ).rejects.toThrow('DATABASE_URL is required')
    } finally {
      if (original !== undefined) {
        process.env['DATABASE_URL'] = original
      }
    }
  })
})
