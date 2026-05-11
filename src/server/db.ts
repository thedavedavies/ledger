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

const client = globalThis.__dbClient ?? postgres(databaseUrl, { max: 10 })
if (!globalThis.__dbClient) globalThis.__dbClient = client

export const db = drizzle(client, { schema })
