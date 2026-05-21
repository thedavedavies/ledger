import { describe, expect, it } from 'vitest'
import {
  addDaysToDateOnly,
  compareDateOnly,
  dateOnlyToUtcDate,
  formatDateOnly,
  isValidDateOnly,
  utcDateToDateOnly,
} from '#/lib/date-only'

describe('date-only helpers', () => {
  it('rejects malformed and calendar-invalid dates', () => {
    expect(isValidDateOnly('2026-05-09')).toBe(true)
    expect(isValidDateOnly('2026/05/09')).toBe(false)
    expect(isValidDateOnly('2026-02-31')).toBe(false)
  })

  it('stores date-only input at UTC midnight', () => {
    const date = dateOnlyToUtcDate('2026-05-09')

    expect(date.toISOString()).toBe('2026-05-09T00:00:00.000Z')
  })

  it('formats stored UTC timestamps without local timezone drift', () => {
    expect(formatDateOnly(new Date('2026-05-09T00:00:00.000Z'))).toBe('May 9, 2026')
    expect(utcDateToDateOnly(new Date('2026-05-09T00:00:00.000Z'))).toBe('2026-05-09')
  })

  it('adds days to date-only values across month boundaries', () => {
    expect(addDaysToDateOnly('2026-01-15', 30)).toBe('2026-02-14')
  })

  it('compares validated date-only values lexically', () => {
    expect(compareDateOnly('2026-05-09', '2026-05-08')).toBeGreaterThan(0)
    expect(compareDateOnly('2026-05-09', '2026-05-09')).toBe(0)
    expect(compareDateOnly('2026-05-08', '2026-05-09')).toBeLessThan(0)
  })
})
