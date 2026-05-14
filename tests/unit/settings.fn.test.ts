import { describe, expect, it } from 'vitest'
import { companyProfileInput } from '#/lib/validators'
import { CURRENCY_CODES } from '#/lib/currency'

describe('companyProfileInput validator', () => {
  const validInput = {
    businessName: 'Acme Inc.',
    address: '123 Main St',
    city: 'Springfield',
    postcode: '12345',
    country: 'US',
    email: 'billing@acme.com',
    phone: '+1 555 0100',
    taxId: 'US12345678',
    defaultCurrency: 'USD',
    taxRate: '10',
    invoicePrefix: 'INV',
  }

  it('accepts valid input', () => {
    const result = companyProfileInput.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('accepts valid input with empty optional fields', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      address: '',
      city: '',
      postcode: '',
      country: '',
      email: '',
      phone: '',
      taxId: '',
      taxRate: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty business name', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      businessName: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Business name is required')
    }
  })

  it('rejects unrecognised currency code', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      defaultCurrency: 'FAKE',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Unrecognised currency code')
    }
  })

  it('accepts all supported currency codes', () => {
    for (const code of CURRENCY_CODES) {
      const result = companyProfileInput.safeParse({
        ...validInput,
        defaultCurrency: code,
      })
      expect(result.success).toBe(true)
    }
  })

  it('rejects tax rate over 100', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      taxRate: '101',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Tax rate must be between 0 and 100')
    }
  })

  it('rejects negative tax rate', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      taxRate: '-5',
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-numeric tax rate', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      taxRate: 'abc',
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero tax rate', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      taxRate: '0',
    })
    expect(result.success).toBe(true)
  })

  it('accepts decimal tax rate', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      taxRate: '7.5',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty invoice prefix', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      invoicePrefix: '',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Invoice prefix is required')
    }
  })

  it('rejects invoice prefix with special characters', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      invoicePrefix: 'INV@#',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      email: 'not-an-email',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Invalid email address')
    }
  })

  it('accepts valid email', () => {
    const result = companyProfileInput.safeParse({
      ...validInput,
      email: 'hello@example.com',
    })
    expect(result.success).toBe(true)
  })
})
