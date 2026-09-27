import { describe, expect, it } from 'vitest'
import {
  DIGITS,
  HEX,
  LOWER,
  STANDARD_DIGITS,
  STANDARD_LOWER,
  STANDARD_UPPER,
  STRONG_BASE,
  SYMBOLS,
  UPPER,
} from './charsets'
import vectors from './test-vectors.json'

const without = (alphabet: string, excluded: string) => [...alphabet].filter((c) => !excluded.includes(c)).join('')

describe('charsets', () => {
  it('match the cross-platform vectors', () => {
    expect(STANDARD_LOWER).toBe(vectors.alphabets.standardLower)
    expect(STANDARD_UPPER).toBe(vectors.alphabets.standardUpper)
    expect(STANDARD_DIGITS).toBe(vectors.alphabets.standardDigits)
    expect(LOWER).toBe(vectors.alphabets.strongLower)
    expect(UPPER).toBe(vectors.alphabets.strongUpper)
    expect(DIGITS).toBe(vectors.alphabets.strongDigits)
    expect(SYMBOLS).toBe(vectors.alphabets.strongSymbols)
    expect(HEX).toBe(vectors.alphabets.hex)
  })

  it('derive the Standard sets by excluding exactly l, O, I, 0, 1', () => {
    expect(STANDARD_LOWER).toBe(without(LOWER, 'l'))
    expect(STANDARD_UPPER).toBe(without(UPPER, 'OI'))
    expect(STANDARD_DIGITS).toBe(without(DIGITS, '01'))
  })

  it('have the documented sizes', () => {
    expect([STANDARD_LOWER.length, STANDARD_UPPER.length, STANDARD_DIGITS.length]).toEqual([25, 24, 8])
    expect(SYMBOLS).toHaveLength(13)
    expect(STRONG_BASE).toHaveLength(75)
  })

  it('exclude quotes, backslash and backtick from symbols', () => {
    for (const c of `'"\\\``) expect(SYMBOLS).not.toContain(c)
  })

  it('have no duplicate characters', () => {
    for (const set of [STANDARD_LOWER, STANDARD_UPPER, STANDARD_DIGITS, STRONG_BASE, HEX]) {
      expect(new Set(set).size).toBe(set.length)
    }
  })
})
