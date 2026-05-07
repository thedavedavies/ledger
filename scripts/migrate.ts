import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

try { process.loadEnvFile() } catch { /* .env optional in prod (Compose injects env) */ }

const databaseUrl = process.env['DATABASE_URL']
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const client = postgres(databaseUrl, { max: 1 })
const db = drizzle(client)

async function main() {
  console.log('Running migrations...')
  await migrate(db, { migrationsFolder: 'drizzle' })
  console.log('Migrations complete.')
  await client.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
