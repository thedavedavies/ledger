import { z } from 'zod'
import { CURRENCY_CODES } from './currency'

export const companyProfileInput = z.object({
  businessName: z
    .string()
    .min(1, 'Business name is required')
    .max(200, 'Business name must be 200 characters or fewer'),
  address: z.string().max(500, 'Address must be 500 characters or fewer'),
  city: z.string().max(100, 'City must be 100 characters or fewer'),
  postcode: z.string().max(20, 'Postcode must be 20 characters or fewer'),
  country: z.string().max(100, 'Country must be 100 characters or fewer'),
  email: z
    .string()
    .email('Invalid email address')
    .or(z.literal(''))
    .default(''),
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
