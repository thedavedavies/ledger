import { describe, it, expect } from 'vitest'
import {
  clientInput,
  companyProfileInput,
  invoiceInput,
  invoiceLineInput,
  invoiceStatusInput,
  paymentInput,
  PAYMENT_METHODS,
} from '#/lib/validators'

const validProfile = {
  businessName: 'Acme Co',
  address: '1 High Street',
  city: 'London',
  postcode: 'EC1A 1AA',
  country: 'United Kingdom',
  email: 'hello@acme.test',
  phone: '+44 20 7946 0000',
  taxId: 'GB123456789',
  defaultCurrency: 'GBP',
  taxRate: '20',
  invoicePrefix: 'INV',
}

const validLine = {
  description: 'Consulting',
  quantity: '1',
  unitPrice: '100.00',
}

const validInvoice = {
  clientId: '00000000-0000-4000-8000-000000000000',
  issueDate: '2026-05-09',
  dueDate: '2026-06-08',
  taxRate: '20',
  notes: '',
  lineItems: [validLine],
}

describe('companyProfileInput', () => {
  it('accepts a fully populated profile', () => {
    expect(companyProfileInput.safeParse(validProfile).success).toBe(true)
  })

  it('rejects an empty business name', () => {
    const r = companyProfileInput.safeParse({ ...validProfile, businessName: '' })
    expect(r.success).toBe(false)
  })

  it('accepts an empty email (opt-out)', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, email: '' }).success,
    ).toBe(true)
  })

  it('rejects a malformed email', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, email: 'not-an-email' }).success,
    ).toBe(false)
  })

  it('rejects an unknown currency code', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, defaultCurrency: 'XYZ' })
        .success,
    ).toBe(false)
  })

  it('rejects a tax rate above 100', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, taxRate: '150' }).success,
    ).toBe(false)
  })

  it('rejects a negative tax rate', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, taxRate: '-5' }).success,
    ).toBe(false)
  })

  it('treats blank tax rate as valid (defaults applied)', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, taxRate: '' }).success,
    ).toBe(true)
  })

  it('rejects an invoice prefix containing whitespace or symbols', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, invoicePrefix: 'IN V' })
        .success,
    ).toBe(false)
    expect(
      companyProfileInput.safeParse({ ...validProfile, invoicePrefix: 'IN/V' })
        .success,
    ).toBe(false)
  })

  it('accepts an invoice prefix with letters, numbers, and hyphens', () => {
    expect(
      companyProfileInput.safeParse({ ...validProfile, invoicePrefix: 'INV-2026' })
        .success,
    ).toBe(true)
  })
})

describe('clientInput', () => {
  it('requires a contact name', () => {
    expect(clientInput.safeParse({ name: '' }).success).toBe(false)
  })

  it('accepts a minimal client (name only) and applies string defaults', () => {
    const r = clientInput.safeParse({ name: 'Eleanor Pike' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.companyName).toBe('')
      expect(r.data.email).toBe('')
      expect(r.data.notes).toBe('')
    }
  })

  it('rejects a malformed email but accepts an empty one', () => {
    expect(clientInput.safeParse({ name: 'X', email: 'not-email' }).success).toBe(false)
    expect(clientInput.safeParse({ name: 'X', email: '' }).success).toBe(true)
  })
})

describe('invoiceLineInput', () => {
  it('requires a description', () => {
    expect(
      invoiceLineInput.safeParse({ ...validLine, description: '' }).success,
    ).toBe(false)
  })

  it('rejects quantity of 0 or below', () => {
    expect(invoiceLineInput.safeParse({ ...validLine, quantity: '0' }).success).toBe(false)
    expect(invoiceLineInput.safeParse({ ...validLine, quantity: '-1' }).success).toBe(false)
  })

  it('accepts a non-integer quantity', () => {
    expect(invoiceLineInput.safeParse({ ...validLine, quantity: '2.5' }).success).toBe(true)
  })

  it('accepts a unit price of 0 (free line item)', () => {
    expect(invoiceLineInput.safeParse({ ...validLine, unitPrice: '0' }).success).toBe(true)
  })

  it('rejects a negative unit price', () => {
    expect(invoiceLineInput.safeParse({ ...validLine, unitPrice: '-1' }).success).toBe(false)
  })
})

describe('invoiceInput', () => {
  it('accepts a valid invoice', () => {
    expect(invoiceInput.safeParse(validInvoice).success).toBe(true)
  })

  it('rejects a non-UUID clientId', () => {
    expect(
      invoiceInput.safeParse({ ...validInvoice, clientId: 'not-uuid' }).success,
    ).toBe(false)
  })

  it('requires at least one line item', () => {
    expect(
      invoiceInput.safeParse({ ...validInvoice, lineItems: [] }).success,
    ).toBe(false)
  })

  it('caps line items at 100', () => {
    const tooMany = Array.from({ length: 101 }, () => validLine)
    expect(
      invoiceInput.safeParse({ ...validInvoice, lineItems: tooMany }).success,
    ).toBe(false)
  })

  it('rejects a tax rate outside 0–100', () => {
    expect(invoiceInput.safeParse({ ...validInvoice, taxRate: '101' }).success).toBe(false)
  })
})

describe('invoiceStatusInput', () => {
  it('accepts each known status', () => {
    const id = '00000000-0000-4000-8000-000000000000'
    for (const status of ['draft', 'sent', 'paid', 'void']) {
      expect(invoiceStatusInput.safeParse({ id, status }).success).toBe(true)
    }
  })

  it('rejects an unknown status', () => {
    expect(
      invoiceStatusInput.safeParse({
        id: '00000000-0000-4000-8000-000000000000',
        status: 'overdue',
      }).success,
    ).toBe(false)
  })
})

describe('paymentInput', () => {
  const validPayment = {
    invoiceId: '00000000-0000-4000-8000-000000000000',
    amount: '100.00',
    paidAt: '2026-05-09',
    method: '',
    reference: '',
    notes: '',
  }

  it('accepts a valid payment', () => {
    expect(paymentInput.safeParse(validPayment).success).toBe(true)
  })

  it('rejects an amount of 0 or below', () => {
    expect(paymentInput.safeParse({ ...validPayment, amount: '0' }).success).toBe(false)
    expect(paymentInput.safeParse({ ...validPayment, amount: '-5' }).success).toBe(false)
  })

  it('requires paidAt', () => {
    expect(paymentInput.safeParse({ ...validPayment, paidAt: '' }).success).toBe(false)
  })

  it('rejects a non-UUID invoiceId', () => {
    expect(
      paymentInput.safeParse({ ...validPayment, invoiceId: 'not-uuid' }).success,
    ).toBe(false)
  })

  it('accepts each canonical payment method', () => {
    for (const method of PAYMENT_METHODS) {
      const r = paymentInput.safeParse({ ...validPayment, method })
      expect(r.success, `should accept method "${method}"`).toBe(true)
    }
  })
})

describe('PAYMENT_METHODS', () => {
  it('includes the most common business methods', () => {
    expect(PAYMENT_METHODS).toContain('Bank transfer')
    expect(PAYMENT_METHODS).toContain('Card')
    expect(PAYMENT_METHODS).toContain('Cash')
    expect(PAYMENT_METHODS).toContain('Cheque')
    expect(PAYMENT_METHODS).toContain('Other')
  })

  it('contains no duplicates', () => {
    expect(new Set(PAYMENT_METHODS).size).toBe(PAYMENT_METHODS.length)
  })
})
