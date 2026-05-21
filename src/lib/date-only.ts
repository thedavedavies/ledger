const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export type DateOnlyParts = {
  year: number
  month: number
  day: number
}

export function parseDateOnly(value: string): DateOnlyParts | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

export function isValidDateOnly(value: string): boolean {
  return parseDateOnly(value) !== null
}

export function dateOnlyToUtcDate(value: string): Date {
  const parts = parseDateOnly(value)
  if (!parts) throw new Error(`Invalid date-only value: ${value}`)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

export function utcDateToDateOnly(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function localDateToDateOnly(value: Date = new Date()): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysToDateOnly(value: string, days: number): string {
  const parts = parseDateOnly(value)
  if (!parts) throw new Error(`Invalid date-only value: ${value}`)

  const date = new Date(parts.year, parts.month - 1, parts.day)
  date.setDate(date.getDate() + days)
  return localDateToDateOnly(date)
}

export function formatDateOnly(value: string | Date, locale = 'en-US'): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function compareDateOnly(a: string, b: string): number {
  if (!isValidDateOnly(a) || !isValidDateOnly(b)) {
    throw new Error('compareDateOnly requires valid YYYY-MM-DD values')
  }
  if (a === b) return 0
  return a < b ? -1 : 1
}
