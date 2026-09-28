import { describe, expect, it } from 'vitest'
import vercel from '../vercel.json'

const EXPECTED_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self'",
  "manifest-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
]

const EXPECTED_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(self), clipboard-write=(self)',
}

describe('vercel.json', () => {
  const rule = vercel.headers.find((r) => r.source === '/(.*)')
  const headers = Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]))

  it('applies the security headers to every path', () => {
    expect(rule).toBeDefined()
    expect(vercel.headers).toHaveLength(1)
  })

  it('sends exactly the specified CSP, no more and no less', () => {
    const directives = headers['Content-Security-Policy'].split(';').map((d: string) => d.trim())
    expect(directives.sort()).toEqual([...EXPECTED_CSP].sort())
  })

  it.each(Object.entries(EXPECTED_HEADERS))('sends %s', (key, value) => {
    expect(headers[key]).toBe(value)
  })

  it('sends nothing unexpected', () => {
    expect(Object.keys(headers).sort()).toEqual(['Content-Security-Policy', ...Object.keys(EXPECTED_HEADERS)].sort())
  })

  it('permanently redirects /generate to /', () => {
    expect(vercel.redirects).toEqual([{ source: '/generate', destination: '/', permanent: true }])
  })

  it('serves clean URLs, so /privacy maps to privacy.html', () => {
    expect(vercel.cleanUrls).toBe(true)
  })
})
