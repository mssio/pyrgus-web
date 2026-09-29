import { describe, expect, it } from 'vitest'
import {
  isSupportProduct,
  isSupportTopic,
  SUPPORT_MESSAGE_MAX,
  SUPPORT_PRODUCTS,
  SUPPORT_TOPICS,
  supportMailto,
  supportSubject,
  type SupportProduct,
  type SupportTopic,
} from './supportMail'

/**
 * Splits a mailto URL by hand. URLSearchParams is not used: it decodes `+` as a space, which is not
 * what mailto (RFC 6068) means.
 */
function parse(url: string) {
  const q = url.indexOf('?')
  const pairs = url
    .slice(q + 1)
    .split('&')
    .map((p) => p.split('='))
  return {
    target: url.slice(0, q),
    keys: pairs.map(([k]) => k),
    values: Object.fromEntries(pairs.map(([k, v]) => [k, decodeURIComponent(v)])),
    raw: Object.fromEntries(pairs.map(([k, v]) => [k, v])),
  }
}

describe('supportMail', () => {
  it('lists the topics and products in the approved order', () => {
    expect(SUPPORT_TOPICS).toEqual(['Question', 'Bug report', 'Feature request', 'Other'])
    expect(SUPPORT_PRODUCTS).toEqual(['Pyrgus Web', 'iPhone', 'iPad', 'Mac'])
    expect(SUPPORT_MESSAGE_MAX).toBe(2000)
  })

  it('recognises only listed topics and products', () => {
    expect(isSupportTopic('Bug report')).toBe(true)
    expect(isSupportTopic('bug report')).toBe(false)
    expect(isSupportTopic('')).toBe(false)
    expect(isSupportProduct('Mac')).toBe(true)
    expect(isSupportProduct('Android')).toBe(false)
  })

  it('builds the subject', () => {
    expect(supportSubject('Bug report', 'Mac')).toBe('Pyrgus: Bug report (Mac)')
  })

  it('builds the exact mailto URL', () => {
    expect(supportMailto('Question', 'Pyrgus Web', 'Hello\nThanks')).toBe(
      'mailto:support@e.mss.io?subject=Pyrgus%3A%20Question%20(Pyrgus%20Web)&body=Hello%0D%0AThanks',
    )
  })

  it('round-trips awkward characters exactly', () => {
    const message = 'a & b ? c # d % e + f = g / h : i 🦋 日本語 "q" <x>'
    const { target, keys, values } = parse(supportMailto('Other', 'iPad', message))
    expect(target).toBe('mailto:support@e.mss.io')
    expect(keys).toEqual(['subject', 'body'])
    expect(values.subject).toBe('Pyrgus: Other (iPad)')
    expect(values.body).toBe(message)
  })

  it('sends every kind of line break as CRLF', () => {
    for (const message of ['a\nb', 'a\r\nb', 'a\rb']) {
      expect(parse(supportMailto('Other', 'Mac', message)).raw.body).toBe('a%0D%0Ab')
    }
    expect(parse(supportMailto('Other', 'Mac', 'a\n\nb')).raw.body).toBe('a%0D%0A%0D%0Ab')
  })

  it('keeps header-shaped text inside the body', () => {
    for (const message of [
      'hi&cc=x@example.com',
      'hi&bcc=x@example.com&to=y@example.com',
      '%0D%0ABcc: x@example.com',
    ]) {
      const { target, keys, values } = parse(supportMailto('Question', 'iPhone', message))
      expect(target).toBe('mailto:support@e.mss.io')
      expect(keys).toEqual(['subject', 'body'])
      expect(values.body).toBe(message)
    }
  })

  it('replaces lone surrogates instead of throwing', () => {
    const { values } = parse(supportMailto('Bug report', 'Mac', 'x\uD800y\uDC00z'))
    expect(values.body).toBe('x�y�z')
  })

  it('rejects unknown topics and products and empty messages', () => {
    expect(() => supportMailto('Nope' as SupportTopic, 'Mac', 'hi')).toThrow(RangeError)
    expect(() => supportMailto('Question', 'Android' as SupportProduct, 'hi')).toThrow(RangeError)
    expect(() => supportMailto('Question', 'Mac', '')).toThrow(RangeError)
    expect(() => supportMailto('Question', 'Mac', ' \n\t ')).toThrow(RangeError)
  })
})
