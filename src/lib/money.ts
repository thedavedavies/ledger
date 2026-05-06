import Decimal from 'decimal.js'

export function roundHalfAwayFromZero(value: number): bigint {
  if (value >= 0) {
    return BigInt(Math.floor(value + 0.5))
  }
  return BigInt(-Math.floor(-value + 0.5))
}

export function toCents(decimalString: string): bigint {
  const d = new Decimal(decimalString)
  return BigInt(d.times(100).round().toFixed(0))
}

export function fromCents(cents: bigint): string {
  const isNegative = cents < 0n
  const abs = isNegative ? -cents : cents
  const whole = abs / 100n
  const frac = abs % 100n
  const sign = isNegative ? '-' : ''
  return `${sign}${whole}.${String(frac).padStart(2, '0')}`
}

export function formatMoney(cents: bigint, currency: string): string {
  const num = Number(cents) / 100
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

export function computeLineTotalCents(
  quantity: string,
  unitPriceCents: bigint,
): bigint {
  const qty = new Decimal(quantity)
  const price = new Decimal(unitPriceCents.toString())
  const total = qty.times(price)
  return BigInt(total.round().toFixed(0))
}

export function computeInvoiceTotals(
  lines: Array<{ quantity: string; unitPriceCents: bigint }>,
  taxRatePercent: number,
): {
  subtotalCents: bigint
  taxCents: bigint
  totalCents: bigint
  lineTotals: bigint[]
} {
  const lineTotals = lines.map((line) =>
    computeLineTotalCents(line.quantity, line.unitPriceCents),
  )

  const subtotalCents = lineTotals.reduce((sum, lt) => sum + lt, 0n)

  const taxBp = Math.round(taxRatePercent * 100)
  const taxProduct = subtotalCents * BigInt(taxBp)
  const taxCents = roundHalfAwayFromZero(Number(taxProduct) / 10000)

  const totalCents = subtotalCents + taxCents

  return { subtotalCents, taxCents, totalCents, lineTotals }
}
