import { describe, it, expect } from 'vitest'
import { invoiceInput, invoiceLineInput } from '#/lib/validators'

describe('invoiceLineInput validator', () => {
  it('accepts valid line item', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Web design',
      quantity: '2',
      unitPrice: '100.00',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty description', () => {
    const result = invoiceLineInput.safeParse({
      description: '',
      quantity: '1',
      unitPrice: '100.00',
    })
    expect(result.success).toBe(false)
  })

  it('rejects quantity 0', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Item',
      quantity: '0',
      unitPrice: '100.00',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative quantity', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Item',
      quantity: '-1',
      unitPrice: '100.00',
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative unit price', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Item',
      quantity: '1',
      unitPrice: '-50.00',
    })
    expect(result.success).toBe(false)
  })

  it('accepts zero unit price', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Free item',
      quantity: '1',
      unitPrice: '0',
    })
    expect(result.success).toBe(true)
  })

  it('accepts decimal quantities', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Hours',
      quantity: '2.5',
      unitPrice: '75.00',
    })
    expect(result.success).toBe(true)
  })

  it('defaults per to "" when omitted', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Item',
      quantity: '1',
      unitPrice: '100.00',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.per).toBe('')
    }
  })

  it('accepts a per unit string', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Hosting',
      quantity: '1',
      unitPrice: '100.00',
      per: 'year',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.per).toBe('year')
    }
  })

  it('rejects per longer than 30 characters', () => {
    const result = invoiceLineInput.safeParse({
      description: 'Item',
      quantity: '1',
      unitPrice: '100.00',
      per: 'x'.repeat(31),
    })
    expect(result.success).toBe(false)
  })
})

describe('invoiceInput validator', () => {
  const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  const validLine = {
    description: 'Item',
    quantity: '1',
    unitPrice: '100.00',
  }

  it('accepts valid invoice', () => {
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      taxRate: '20',
      notes: '',
      lineItems: [validLine],
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty line items', () => {
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      taxRate: '0',
      notes: '',
      lineItems: [],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.some((p) => p === 'lineItems'))?.message
      expect(msg).toBe('An invoice needs at least one line item')
    }
  })

  it('rejects more than 100 line items', () => {
    const lines = Array.from({ length: 101 }, () => validLine)
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      taxRate: '0',
      notes: '',
      lineItems: lines,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const msg = result.error.issues.find((i) => i.path.some((p) => p === 'lineItems'))?.message
      expect(msg).toBe('Maximum 100 line items per invoice')
    }
  })

  it('accepts 0 tax rate', () => {
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      taxRate: '0',
      notes: '',
      lineItems: [validLine],
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid client UUID', () => {
    const result = invoiceInput.safeParse({
      clientId: 'not-a-uuid',
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      taxRate: '0',
      notes: '',
      lineItems: [validLine],
    })
    expect(result.success).toBe(false)
  })

  it('rejects tax rate above 100', () => {
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      taxRate: '101',
      notes: '',
      lineItems: [validLine],
    })
    expect(result.success).toBe(false)
  })

  it('rejects due date before issue date', () => {
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-31',
      dueDate: '2026-05-01',
      taxRate: '0',
      notes: '',
      lineItems: [validLine],
    })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 100 line items', () => {
    const lines = Array.from({ length: 100 }, () => validLine)
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      taxRate: '0',
      notes: '',
      lineItems: lines,
    })
    expect(result.success).toBe(true)
  })

  it('defaults tax rate to "0" when omitted', () => {
    const result = invoiceInput.safeParse({
      clientId: VALID_UUID,
      issueDate: '2026-05-01',
      dueDate: '2026-05-31',
      notes: '',
      lineItems: [validLine],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.taxRate).toBe('0')
    }
  })
})
