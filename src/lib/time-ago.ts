const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

function ordinal(day: number): string {
  const v = day % 100
  if (v >= 11 && v <= 13) return `${day}th`
  switch (day % 10) {
    case 1:
      return `${day}st`
    case 2:
      return `${day}nd`
    case 3:
      return `${day}rd`
    default:
      return `${day}th`
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function timeAgo(
  input: Date | string | number,
  now: Date = new Date(),
): string {
  const then = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(then.getTime())) return ''

  const diffMs = now.getTime() - then.getTime()

  // Future or near-future: treat as "just now". Anything > a couple of days in
  // the future falls through to the absolute date branch below.
  if (diffMs < 45_000) return 'Just now'

  const minutes = Math.round(diffMs / 60_000)
  if (minutes < 2) return 'A minute ago'
  if (minutes < 60) return `${minutes} minutes ago`

  const hours = Math.round(diffMs / 3_600_000)
  if (hours < 2) return 'An hour ago'

  // Day-relative formatting based on calendar days, not 24h windows. This
  // means an event at 11pm yesterday reads "Yesterday" at 1am today, not
  // "2 hours ago" — matching how people actually think about time.
  const dayDiff = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000)

  if (dayDiff === 0) return `${hours} hours ago`
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return `${dayDiff} days ago`

  const dayLabel = `${ordinal(then.getDate())} ${MONTHS[then.getMonth()]}`
  if (then.getFullYear() === now.getFullYear()) return dayLabel
  return `${dayLabel} ${then.getFullYear()}`
}
