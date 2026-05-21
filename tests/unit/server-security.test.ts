import { describe, expect, it } from 'vitest'
import server from '#/server'

describe('server security wrapper', () => {
  it('rejects cross-origin mutating requests before routing', async () => {
    const response = await server.fetch(
      new Request('http://localhost:3000/_server', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://evil.example',
        },
      }),
    )

    expect(response.status).toBe(403)
    await expect(response.text()).resolves.toBe('Cross-origin request rejected')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Referrer-Policy')).toBe('same-origin')
  })

  it('allows same-origin mutating requests through the origin check', async () => {
    const response = await server.fetch(
      new Request('http://localhost:3000/__definitely_missing__', {
        method: 'POST',
        headers: {
          Host: 'localhost:3000',
          Origin: 'http://localhost:3000',
        },
      }),
    )

    expect(response.status).not.toBe(403)
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })
})
