import { describe, it, expect } from 'vitest'
import { formatInvoiceNumber } from '#/server/numbering'

describe('formatInvoiceNumber', () => {
  it('formats first invoice of year with zero-padding', () => {
    expect(formatInvoiceNumber('INV', 2026, 1)).toBe('INV-2026-0001')
  })

  it('formats multi-digit number', () => {
    expect(formatInvoiceNumber('INV', 2026, 42)).toBe('INV-2026-0042')
  })

  it('formats number at 4-digit boundary', () => {
    expect(formatInvoiceNumber('INV', 2026, 9999)).toBe('INV-2026-9999')
  })

  it('handles custom prefix', () => {
    expect(formatInvoiceNumber('ACME', 2025, 7)).toBe('ACME-2025-0007')
  })

  it('handles number > 9999 without truncation', () => {
    expect(formatInvoiceNumber('INV', 2026, 10000)).toBe('INV-2026-10000')
  })
})
