import { serve } from '@hono/node-server'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import handler from '../dist/server/server.js'

const CLIENT_DIR = resolve(fileURLToPath(new URL('.', import.meta.url)), '../dist/client')

const MIME = {
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

async function tryServeStatic(pathname) {
  const filePath = join(CLIENT_DIR, pathname)
  if (!filePath.startsWith(CLIENT_DIR + '/')) return null
  try {
    const data = await readFile(filePath)
    const mime = MIME[extname(filePath)] || 'application/octet-stream'
    return new Response(data, {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return null
  }
}

const port = Number(process.env.PORT) || 3000
const hostname = process.env.BIND_HOST || '127.0.0.1'

const server = serve(
  {
    fetch: async (request) => {
      const { pathname } = new URL(request.url)
      if (pathname.startsWith('/assets/') || pathname === '/favicon.ico') {
        const res = await tryServeStatic(pathname)
        if (res) return res
      }
      return handler.fetch(request)
    },
    port,
    hostname,
  },
  ({ address, port }) => {
    console.log(`ledger listening on http://${address}:${port}`)
  },
)

// Drain in-flight requests on `docker compose stop` (SIGTERM) and Ctrl-C
// (SIGINT) instead of dropping them mid-transaction. After 10s force-exit
// so a stuck connection doesn't keep the container alive forever.
let shuttingDown = false
function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`received ${signal}, draining...`)
  const forceExit = setTimeout(() => {
    console.error('shutdown timed out, exiting')
    process.exit(1)
  }, 10_000)
  forceExit.unref()
  server.close((err) => {
    if (err) {
      console.error('shutdown error', err)
      process.exit(1)
    }
    process.exit(0)
  })
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
