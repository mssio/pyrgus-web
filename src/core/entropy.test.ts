import { describe, expect, it } from 'vitest'
import { entropyBits, formatEntropy, isExactEntropy } from './entropy'
import { DEFAULT_OPTIONS, PIN_LENGTHS, type FormatId, type Options } from './formats'
import vectors from './test-vectors.json'

const cases: [keyof typeof vectors.entropy, FormatId, Options][] = [
  ['standard', 'standard', DEFAULT_OPTIONS],
  ['strong', 'strong', DEFAULT_OPTIONS],
  ['memorable', 'memorable', DEFAULT_OPTIONS],
  ['pin4', 'pin', { pinLength: 4 }],
  ['pin6', 'pin', { pinLength: 6 }],
  ['pin8', 'pin', { pinLength: 8 }],
  ['secret128', 'secret128', DEFAULT_OPTIONS],
  ['secret256', 'secret256', DEFAULT_OPTIONS],
]

describe('entropy', () => {
  it.each(cases)('%s matches the cross-platform vectors', (key, id, options) => {
    expect(entropyBits(id, options)).toBeCloseTo(vectors.entropy[key].bits, 3)
    expect(formatEntropy(id, options)).toBe(vectors.entropy[key].display)
  })

  it('computes Standard from the documented formula', () => {
    const expected = Math.log2(18 * 17 * 24 * 8) + 16 * Math.log2(25)
    expect(entropyBits('standard', DEFAULT_OPTIONS)).toBeCloseTo(expected, 10)
  })

  it('computes Memorable and PIN from the documented formulas', () => {
    expect(entropyBits('memorable', DEFAULT_OPTIONS)).toBeCloseTo(4 * Math.log2(7776) + Math.log2(100), 10)
    for (const pinLength of PIN_LENGTHS) {
      expect(entropyBits('pin', { pinLength })).toBeCloseTo(pinLength * Math.log2(10), 10)
    }
  })

  it('marks only Strong as approximate', () => {
    expect(isExactEntropy('strong', DEFAULT_OPTIONS)).toBe(false)
    for (const id of ['standard', 'memorable', 'pin', 'secret128', 'secret256'] as const) {
      expect(isExactEntropy(id, DEFAULT_OPTIONS)).toBe(true)
    }
  })
})
