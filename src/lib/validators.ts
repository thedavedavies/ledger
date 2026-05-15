import { z } from 'zod'
import { CURRENCY_CODES } from './currency'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// `<input type="date">` returns `YYYY-MM-DD` strings.  Reject anything else
// (including '2024-13-01' which `new Date` would silently parse to NaN and
// crash the invoice-numbering upsert downstream).
const dateString = (label: string) =>
  z.string().refine(
    (v) => {
      if (!ISO_DATE.test(v)) return false
      const t = new Date(v + 'T00:00:00Z').getTime()
      return Number.isFinite(t)
    },
    { message: `${label} must be a valid date (YYYY-MM-DD)` },
  )

// At most two decimal places, no scientific notation, no Infinity/NaN.
// Prevents '0.001' (silently rounds to $0.00) and 'Infinity' (crashes
// `BigInt('Infinity')` downstream).
const moneyString = (label: string, opts: { allowZero?: boolean } = {}) =>
  z.string().refine(
    (v) => {
      if (!/^\d+(\.\d{1,2})?$/.test(v)) return false
      const n = Number(v)
      if (!Number.isFinite(n)) return false
      return opts.allowZero ? n >= 0 : n > 0
    },
    {
      message: opts.allowZero
        ? `${label} must be 0 or greater with at most 2 decimal places`
        : `${label} must be greater than 0 with at most 2 decimal places`,
    },
  )

/**
 * Canonical payment methods offered in the Record payment dialog.  The DB
 * column is plain text so historical or imported rows can hold anything, but
 * the UI is constrained to this list to keep activity feeds and reporting
 * tidy.
 */
export const PAYMENT_METHODS = [
  'Bank transfer',
  'Card',
  'Cash',
  'Cheque',
  'PayPal',
  'Stripe',
  'Other',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const companyProfileInput = z.object({
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Business name must be 200 characters or fewer'),
  address: z.string().max(500, 'Address must be 500 characters or fewer'),
  city: z.string().max(100, 'City must be 100 characters or fewer'),
  postcode: z.string().max(20, 'Postcode must be 20 characters or fewer'),
  country: z.string().max(100, 'Country must be 100 characters or fewer'),
  email: z.string().email('Invalid email address').or(z.literal('')).default(''),
  phone: z.string().max(30, 'Phone must be 30 characters or fewer'),
  taxId: z.string().max(50, 'Tax ID must be 50 characters or fewer'),
  defaultCurrency: z.enum(CURRENCY_CODES as unknown as [string, ...string[]], {
    error: 'Unrecognised currency code',
  }),
  taxRate: z
    .string()
    .refine(
      (v) => {
        if (v === '') return true
        const n = Number(v)
        return !isNaN(n) && n >= 0 && n <= 100
      },
      { message: 'Tax rate must be between 0 and 100' },
    )
    .default('0'),
  invoicePrefix: z
    .string()
    .min(1, 'Invoice prefix is required')
    .max(10, 'Invoice prefix must be 10 characters or fewer')
    .regex(/^[A-Za-z0-9-]+$/, 'Prefix may only contain letters, numbers, and hyphens'),
})

export type CompanyProfileInput = z.infer<typeof companyProfileInput>

export const clientInput = z.object({
  name: z
    .string()
    .min(1, 'Contact name is required')
    .max(200, 'Name must be 200 characters or fewer'),
  companyName: z.string().max(200, 'Company name must be 200 characters or fewer').default(''),
  email: z.string().email('Invalid email address').or(z.literal('')).default(''),
  address: z.string().max(500, 'Address must be 500 characters or fewer').default(''),
  city: z.string().max(100, 'City must be 100 characters or fewer').default(''),
  postcode: z.string().max(20, 'Postcode must be 20 characters or fewer').default(''),
  country: z.string().max(100, 'Country must be 100 characters or fewer').default(''),
  phone: z.string().max(30, 'Phone must be 30 characters or fewer').default(''),
  notes: z.string().max(2000, 'Notes must be 2000 characters or fewer').default(''),
})

export type ClientInput = z.infer<typeof clientInput>

export const invoiceLineInput = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be 500 characters or fewer'),
  quantity: moneyString('Quantity'),
  unitPrice: moneyString('Unit price', { allowZero: true }),
})

export type InvoiceLineInput = z.infer<typeof invoiceLineInput>

export const invoiceInput = z.object({
  clientId: z.string().uuid('Please select a client'),
  issueDate: dateString('Issue date'),
  dueDate: dateString('Due date'),
  taxRate: z
    .string()
    .refine(
      (v) => {
        if (v === '') return true
        const n = Number(v)
        return !isNaN(n) && n >= 0 && n <= 100
      },
      { message: 'Tax rate must be between 0 and 100' },
    )
    .default('0'),
  notes: z.string().max(2000, 'Notes must be 2000 characters or fewer').default(''),
  lineItems: z
    .array(invoiceLineInput)
    .min(1, 'An invoice needs at least one line item')
    .max(100, 'Maximum 100 line items per invoice'),
})

export type InvoiceInput = z.infer<typeof invoiceInput>

export const invoiceStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(['draft', 'sent', 'paid', 'void']),
})

export const paymentInput = z.object({
  invoiceId: z.string().uuid(),
  amount: moneyString('Amount'),
  paidAt: dateString('Paid date'),
  method: z.string().max(100, 'Method must be 100 characters or fewer').default(''),
  reference: z.string().max(100, 'Reference must be 100 characters or fewer').default(''),
  notes: z.string().max(2000, 'Notes must be 2000 characters or fewer').default(''),
})

export type PaymentInput = z.infer<typeof paymentInput>
