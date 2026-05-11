import { describe, it, expect } from 'vitest'
import { timeAgo } from '#/lib/time-ago'

const now = new Date('2026-05-09T14:00:00Z')

function offset(ms: number): Date {
  return new Date(now.getTime() - ms)
}

describe('timeAgo', () => {
  it('returns "Just now" for under 45 seconds', () => {
    expect(timeAgo(offset(0), now)).toBe('Just now')
    expect(timeAgo(offset(30_000), now)).toBe('Just now')
    expect(timeAgo(offset(44_000), now)).toBe('Just now')
  })

  it('returns "A minute ago" for ~1 minute', () => {
    expect(timeAgo(offset(60_000), now)).toBe('A minute ago')
    expect(timeAgo(offset(89_000), now)).toBe('A minute ago')
  })

  it('returns "N minutes ago" for under an hour', () => {
    expect(timeAgo(offset(5 * 60_000), now)).toBe('5 minutes ago')
    expect(timeAgo(offset(45 * 60_000), now)).toBe('45 minutes ago')
  })

  it('returns "An hour ago" for ~1 hour', () => {
    expect(timeAgo(offset(60 * 60_000), now)).toBe('An hour ago')
    expect(timeAgo(offset(89 * 60_000), now)).toBe('An hour ago')
  })

  it('returns "N hours ago" for same calendar day', () => {
    expect(timeAgo(offset(3 * 3_600_000), now)).toBe('3 hours ago')
    // 13 hours earlier is same day (now is 14:00 UTC, then is 01:00 UTC)
    expect(timeAgo(offset(13 * 3_600_000), now)).toBe('13 hours ago')
  })

  it('switches to "Yesterday" when calendar day changes, even if < 24h', () => {
    // 15h before 14:00 UTC = 23:00 the previous day (UTC).  In UTC-or-eastward
    // locales that's calendar yesterday.
    const yesterday = new Date('2026-05-08T20:00:00Z')
    expect(timeAgo(yesterday, now)).toBe('Yesterday')
  })

  it('returns "N days ago" up to 6 days back', () => {
    const threeDaysBack = new Date('2026-05-06T14:00:00Z')
    expect(timeAgo(threeDaysBack, now)).toBe('3 days ago')
    const sixDaysBack = new Date('2026-05-03T14:00:00Z')
    expect(timeAgo(sixDaysBack, now)).toBe('6 days ago')
  })

  it('returns ordinal date in same year for older events', () => {
    expect(timeAgo(new Date('2026-04-25T14:00:00Z'), now)).toBe('25th April')
    expect(timeAgo(new Date('2026-01-01T14:00:00Z'), now)).toBe('1st January')
    expect(timeAgo(new Date('2026-03-22T14:00:00Z'), now)).toBe('22nd March')
    expect(timeAgo(new Date('2026-02-23T14:00:00Z'), now)).toBe('23rd February')
  })

  it('returns ordinal date with year for prior years', () => {
    expect(timeAgo(new Date('2025-12-25T14:00:00Z'), now)).toBe(
      '25th December 2025',
    )
  })

  it('handles teen-day suffixes', () => {
    expect(timeAgo(new Date('2026-02-11T14:00:00Z'), now)).toBe('11th February')
    expect(timeAgo(new Date('2026-02-12T14:00:00Z'), now)).toBe('12th February')
    expect(timeAgo(new Date('2026-02-13T14:00:00Z'), now)).toBe('13th February')
  })

  it('returns "Just now" for slightly future timestamps (clock skew)', () => {
    expect(timeAgo(new Date(now.getTime() + 5_000), now)).toBe('Just now')
  })

  it('returns empty string for invalid input', () => {
    expect(timeAgo('not a date', now)).toBe('')
  })

  it('accepts an ISO timestamp string', () => {
    expect(timeAgo('2026-05-09T13:30:00Z', now)).toBe('30 minutes ago')
  })

  it('accepts a numeric epoch (ms)', () => {
    expect(timeAgo(now.getTime() - 5 * 60_000, now)).toBe('5 minutes ago')
  })

  it('transitions from "N days ago" to ordinal date at the 7-day boundary', () => {
    const sevenDaysAgo = new Date('2026-05-02T14:00:00Z')
    expect(timeAgo(sevenDaysAgo, now)).toBe('2nd May')
  })

  it('formats 21st / 23rd / 31st ordinals correctly', () => {
    expect(timeAgo(new Date('2026-01-21T14:00:00Z'), now)).toBe('21st January')
    expect(timeAgo(new Date('2026-01-23T14:00:00Z'), now)).toBe('23rd January')
    expect(timeAgo(new Date('2026-01-31T14:00:00Z'), now)).toBe('31st January')
  })
})
