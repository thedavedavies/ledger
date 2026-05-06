import { sql } from 'drizzle-orm'
import type { db } from './db'

export function formatInvoiceNumber(
  prefix: string,
  year: number,
  sequence: number,
): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function allocateInvoiceNumber(
  tx: Transaction,
  year: number,
  prefix: string,
): Promise<string> {
  const result = await tx.execute(sql`
    INSERT INTO number_sequence (year, last_value) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last_value = number_sequence.last_value + 1
    RETURNING last_value
  `)

  const lastValue = Number(result[0].last_value)
  return formatInvoiceNumber(prefix, year, lastValue)
}
