import { describe, expect, it } from 'vitest'
import { spell } from './spell'

describe('spell', () => {
  it('announces case and separators', () => {
    expect(spell('ab-Rc7')).toBe('a, b, dash, capital R, c, 7')
  })

  it('names every Strong symbol', () => {
    expect(spell('!@#$%^&*-_=+?')).toBe(
      'exclamation mark, at, hash, dollar, percent, caret, ampersand, asterisk, dash, underscore, equals, plus, question mark',
    )
  })
})
