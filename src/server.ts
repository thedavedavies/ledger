import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH'])

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
}

const CSP =
  "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'"

function checkOrigin(request: Request): Response | null {
  if (!MUTATING_METHODS.has(request.method)) return null

  const origin = request.headers.get('Origin')
  const referer = request.headers.get('Referer')
  const host = request.headers.get('Host')

  if (!host) return null

  const allowed = origin
    ? new URL(origin).host === host
    : referer
      ? new URL(referer).host === host
      : true

  if (!allowed) {
    return new Response('Cross-origin request rejected', { status: 403 })
  }

  return null
}

function addSecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('text/html')) {
    response.headers.set('Content-Security-Policy', CSP)
  }

  return response
}

const handler = createStartHandler(defaultStreamHandler)

export default {
  async fetch(request: Request) {
    const csrfBlock = checkOrigin(request)
    if (csrfBlock) return addSecurityHeaders(csrfBlock)

    const response = await handler(request)
    return addSecurityHeaders(response)
  },
}
