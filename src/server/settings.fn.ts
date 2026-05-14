import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { companyProfile } from './schema'
import { companyProfileInput } from '#/lib/validators'

export const getCompanyProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const row = await db
    .select()
    .from(companyProfile)
    .where(eq(companyProfile.id, 1))
    .then((rows) => rows[0])

  if (!row) {
    throw new Error('Company profile not found. Run migrations first.')
  }

  return row
})

export const updateCompanyProfile = createServerFn({ method: 'POST' })
  .inputValidator(companyProfileInput)
  .handler(async ({ data }) => {
    const taxRate = data.taxRate === '' ? '0' : data.taxRate

    const [updated] = await db
      .update(companyProfile)
      .set({
        businessName: data.businessName,
        address: data.address,
        city: data.city,
        postcode: data.postcode,
        country: data.country,
        email: data.email,
        phone: data.phone,
        taxId: data.taxId,
        defaultCurrency: data.defaultCurrency,
        taxRate,
        invoicePrefix: data.invoicePrefix,
      })
      .where(eq(companyProfile.id, 1))
      .returning()

    if (!updated) {
      throw new Error('Failed to update company profile')
    }

    return updated
  })
