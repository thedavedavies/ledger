import { serve } from '@hono/node-server'
import handler from '../dist/server/server.js'

const port = Number(process.env.PORT) || 3000
const hostname = process.env.BIND_HOST || '127.0.0.1'

serve({ fetch: handler.fetch, port, hostname }, ({ address, port }) => {
  console.log(`ledger listening on http://${address}:${port}`)
})
