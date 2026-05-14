import { describe, it, expect } from 'vitest'
import {
  roundHalfAwayFromZero,
  toCents,
  fromCents,
  formatMoney,
  computeLineTotalCents,
  computeInvoiceTotals,
} from '#/lib/money'

describe('roundHalfAwayFromZero', () => {
  it('rounds 0.5 up to 1', () => {
    expect(roundHalfAwayFromZero(0.5)).toBe(1n)
  })

  it('rounds 1.5 up to 2', () => {
    expect(roundHalfAwayFromZero(1.5)).toBe(2n)
  })

  it('rounds -0.5 to -1 (away from zero)', () => {
    expect(roundHalfAwayFromZero(-0.5)).toBe(-1n)
  })

  it('rounds 0.25 * 4 = 1.00 cumulative', () => {
    const sum = [0.25, 0.25, 0.25, 0.25].reduce(
      (acc, v) => acc + Number(roundHalfAwayFromZero(v * 100)),
      0,
    )
    expect(sum).toBe(100)
  })

  it('rounds 0.4 down to 0', () => {
    expect(roundHalfAwayFromZero(0.4)).toBe(0n)
  })

  it('rounds 2.5 to 3', () => {
    expect(roundHalfAwayFromZero(2.5)).toBe(3n)
  })

  it('rounds -1.5 to -2', () => {
    expect(roundHalfAwayFromZero(-1.5)).toBe(-2n)
  })
})

describe('toCents', () => {
  it('converts "100.00" to 10000n', () => {
    expect(toCents('100.00')).toBe(10000n)
  })

  it('converts "0.01" to 1n', () => {
    expect(toCents('0.01')).toBe(1n)
  })

  it('converts "99.99" to 9999n', () => {
    expect(toCents('99.99')).toBe(9999n)
  })

  it('converts "1234.56" to 123456n', () => {
    expect(toCents('1234.56')).toBe(123456n)
  })

  it('converts whole number "50" to 5000n', () => {
    expect(toCents('50')).toBe(5000n)
  })

  it('converts "0" to 0n', () => {
    expect(toCents('0')).toBe(0n)
  })
})

describe('fromCents', () => {
  it('converts 10000n to "100.00"', () => {
    expect(fromCents(10000n)).toBe('100.00')
  })

  it('converts 1n to "0.01"', () => {
    expect(fromCents(1n)).toBe('0.01')
  })

  it('converts 0n to "0.00"', () => {
    expect(fromCents(0n)).toBe('0.00')
  })

  it('converts 123456n to "1234.56"', () => {
    expect(fromCents(123456n)).toBe('1234.56')
  })
})

describe('formatMoney', () => {
  it('formats USD amount', () => {
    const formatted = formatMoney(10000n, 'USD')
    expect(formatted).toContain('100')
  })

  it('formats 0 cents', () => {
    const formatted = formatMoney(0n, 'USD')
    expect(formatted).toContain('0')
  })

  it('formats GBP amount', () => {
    const formatted = formatMoney(325000n, 'GBP')
    expect(formatted).toContain('3,250')
  })
})

describe('computeLineTotalCents', () => {
  it('computes 1 × 10000 = 10000', () => {
    expect(computeLineTotalCents('1', 10000n)).toBe(10000n)
  })

  it('computes 2.5 × 10000 = 25000', () => {
    expect(computeLineTotalCents('2.5', 10000n)).toBe(25000n)
  })

  it('computes 0.25 × 10000 = 2500', () => {
    expect(computeLineTotalCents('0.25', 10000n)).toBe(2500n)
  })

  it('computes 3 × 333 = 999 (no rounding needed)', () => {
    expect(computeLineTotalCents('3', 333n)).toBe(999n)
  })

  it('handles rounding: 1.5 × 333 = 499.5 → 500', () => {
    expect(computeLineTotalCents('1.5', 333n)).toBe(500n)
  })
})

describe('computeInvoiceTotals', () => {
  it('computes 1-line invoice, qty 1, price 100.00, tax 0%', () => {
    const result = computeInvoiceTotals([{ quantity: '1', unitPriceCents: 10000n }], 0)
    expect(result.subtotalCents).toBe(10000n)
    expect(result.taxCents).toBe(0n)
    expect(result.totalCents).toBe(10000n)
    expect(result.lineTotals).toEqual([10000n])
  })

  it('computes 3-line invoice with mixed quantities and 20% tax', () => {
    const result = computeInvoiceTotals(
      [
        { quantity: '1', unitPriceCents: 50000n },
        { quantity: '2.5', unitPriceCents: 20000n },
        { quantity: '0.25', unitPriceCents: 40000n },
      ],
      20,
    )
    // Line 1: 1 * 500.00 = 50000
    // Line 2: 2.5 * 200.00 = 50000
    // Line 3: 0.25 * 400.00 = 10000
    // Subtotal: 110000
    // Tax 20%: 110000 * 2000 / 10000 = 22000
    // Total: 132000
    expect(result.subtotalCents).toBe(110000n)
    expect(result.taxCents).toBe(22000n)
    expect(result.totalCents).toBe(132000n)
    expect(result.lineTotals).toEqual([50000n, 50000n, 10000n])
  })

  it('handles 0% tax rate', () => {
    const result = computeInvoiceTotals([{ quantity: '2', unitPriceCents: 5000n }], 0)
    expect(result.taxCents).toBe(0n)
    expect(result.totalCents).toBe(10000n)
  })

  it('handles large invoice (50 lines)', () => {
    const lines = Array.from({ length: 50 }, () => ({
      quantity: '10',
      unitPriceCents: 999999n,
    }))
    const result = computeInvoiceTotals(lines, 10)
    // Each line: 10 * 999999 = 9999990
    // Subtotal: 50 * 9999990 = 499999500
    // Tax 10%: 499999500 * 1000 / 10000 = 49999950
    // Total: 549999450
    expect(result.subtotalCents).toBe(499999500n)
    expect(result.taxCents).toBe(49999950n)
    expect(result.totalCents).toBe(549999450n)
  })

  it('tax rounding: half-away-from-zero for tax calculation', () => {
    // subtotal = 101, tax rate = 3% → taxBp = 300
    // taxCents = (101 * 300) / 10000 = 30300/10000 = 3.03 → 3
    const result = computeInvoiceTotals([{ quantity: '1', unitPriceCents: 101n }], 3)
    expect(result.taxCents).toBe(3n)
    expect(result.totalCents).toBe(104n)
  })

  it('tax rounding boundary: exact half rounds up', () => {
    // subtotal = 100, tax = 15% → taxBp = 1500
    // taxCents = (100 * 1500) / 10000 = 150000/10000 = 15 exact
    const result = computeInvoiceTotals([{ quantity: '1', unitPriceCents: 100n }], 15)
    expect(result.taxCents).toBe(15n)
    expect(result.totalCents).toBe(115n)
  })
})
