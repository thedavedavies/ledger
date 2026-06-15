import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const databaseUrl = process.env['DATABASE_URL']
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

// Reuse one client across Vite HMR module reloads. Without this, every dev
// reload opens a fresh pool and the old connections sit idle until Postgres
// caps out with "too many clients already".
declare global {
  var __dbClient: ReturnType<typeof postgres> | undefined
}

const client =
  globalThis.__dbClient ??
  postgres(databaseUrl, {
    max: 10,
    // Close pooled connections that have sat idle for 30s so a transient pool
    // exhaustion (a stuck query holding a slot) self-heals over time.
    idle_timeout: 30,
    // Server-side cap: 10s per statement. Combined with idle_timeout this
    // prevents a single slow query from holding a connection indefinitely.
    connection: { statement_timeout: 10_000 },
  })
if (!globalThis.__dbClient) globalThis.__dbClient = client

export const db = drizzle(client, { schema })
