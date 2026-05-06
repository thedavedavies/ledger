import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const companyProfile = pgTable(
  'company_profile',
  {
    id: integer().primaryKey().default(1),
    businessName: text('business_name').notNull().default(''),
    address: text().notNull().default(''),
    city: text().notNull().default(''),
    postcode: text().notNull().default(''),
    country: text().notNull().default(''),
    email: text().notNull().default(''),
    phone: text().notNull().default(''),
    taxId: text('tax_id').notNull().default(''),
    defaultCurrency: text('default_currency').notNull().default('USD'),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    invoicePrefix: text('invoice_prefix').notNull().default('INV'),
    logoPath: text('logo_path'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('company_profile_singleton', sql`${t.id} = 1`)],
)

export const client = pgTable('client', {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`),
  name: text().notNull(),
  email: text().notNull(),
  address: text().notNull().default(''),
  city: text().notNull().default(''),
  postcode: text().notNull().default(''),
  country: text().notNull().default(''),
  phone: text().notNull().default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'void'

export const invoice = pgTable(
  'invoice',
  {
    id: uuid().primaryKey().default(sql`gen_random_uuid()`),
    number: text().notNull(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => client.id),
    status: text().$type<InvoiceStatus>().notNull().default('draft'),
    issueDate: timestamp('issue_date', { withTimezone: true }).notNull(),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
    subtotalCents: bigint('subtotal_cents', { mode: 'bigint' }).notNull().default(sql`0`),
    taxCents: bigint('tax_cents', { mode: 'bigint' }).notNull().default(sql`0`),
    totalCents: bigint('total_cents', { mode: 'bigint' }).notNull().default(sql`0`),
    notes: text().notNull().default(''),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('invoice_number_unique').on(t.number)],
)

export const invoiceLineItem = pgTable('invoice_line_item', {
  id: uuid().primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoice.id, { onDelete: 'cascade' }),
  description: text().notNull(),
  quantity: numeric({ precision: 10, scale: 2 }).notNull(),
  unitPriceCents: bigint('unit_price_cents', { mode: 'bigint' }).notNull(),
  lineTotalCents: bigint('line_total_cents', { mode: 'bigint' }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const numberSequence = pgTable('number_sequence', {
  year: integer().primaryKey(),
  lastValue: integer('last_value').notNull().default(0),
})
