import { describe, expect, it } from 'vitest'
import { ScriptedRandom } from '../../test-support/seeded-random'
import { entropyBits, formatEntropy, isExactEntropy } from './entropy'
import { DEFAULT_OPTIONS, PIN_LENGTHS, type FormatId, type MemorableSeparator, type Options } from './formats'
import { generate } from './generate'
import vectors from './test-vectors.json'

const cases: [keyof typeof vectors.entropy, FormatId, Options][] = [
  ['standard', 'standard', DEFAULT_OPTIONS],
  ['strong', 'strong', DEFAULT_OPTIONS],
  ['memorable', 'memorable', DEFAULT_OPTIONS],
  ['pin4', 'pin', { ...DEFAULT_OPTIONS, pinLength: 4 }],
  ['pin6', 'pin', { ...DEFAULT_OPTIONS, pinLength: 6 }],
  ['pin8', 'pin', { ...DEFAULT_OPTIONS, pinLength: 8 }],
  ['secret128', 'secret128', DEFAULT_OPTIONS],
  ['secret256', 'secret256', DEFAULT_OPTIONS],
]

const SEPARATORS: readonly MemorableSeparator[] = [' ', '-', '_']

describe('entropy', () => {
  it.each(cases)('%s matches the cross-platform vectors', (key, id, options) => {
    expect(entropyBits(id, options)).toBeCloseTo(vectors.entropy[key].bits, 3)
    expect(formatEntropy(id, options)).toBe(vectors.entropy[key].display)
  })

  it('computes Password from the documented formula', () => {
    const expected = Math.log2(18 * 17 * 24 * 8) + 16 * Math.log2(25)
    expect(entropyBits('standard', DEFAULT_OPTIONS)).toBeCloseTo(expected, 10)
  })

  it('computes PIN from the documented formula', () => {
    for (const pinLength of PIN_LENGTHS) {
      expect(entropyBits('pin', { ...DEFAULT_OPTIONS, pinLength })).toBeCloseTo(pinLength * Math.log2(10), 10)
    }
  })

  const customCases = Array.from({ length: 27 }, (_, i) => i + 6).flatMap((n) =>
    [true, false].map((symbols) => [n, symbols] as const),
  )

  it.each(customCases)('Custom Password %i characters, symbols %s: approximate upper bound', (n, symbols) => {
    const options = { ...DEFAULT_OPTIONS, customLength: n, includeSymbols: symbols }
    const bits = n * Math.log2(symbols ? 75 : 62)
    expect(entropyBits('strong', options)).toBeCloseTo(bits, 10)
    expect(isExactEntropy('strong', options)).toBe(false)
    expect(formatEntropy('strong', options)).toBe(`~${Math.floor(bits)}`)
  })

  const memorableDisplays = ['61.7', '74.6', '87.5', '100.4', '113.4']
  const memorableCases = [4, 5, 6, 7, 8].flatMap((n) => SEPARATORS.map((sep) => [n, sep] as const))

  it.each(memorableCases)('Memorable %i words joined by %j: exact, independent of separator', (n, sep) => {
    const options = { ...DEFAULT_OPTIONS, memorableWordCount: n, memorableSeparator: sep }
    expect(entropyBits('memorable', options)).toBeCloseTo(n * Math.log2(7776) + Math.log2(1000), 10)
    expect(isExactEntropy('memorable', options)).toBe(true)
    expect(formatEntropy('memorable', options)).toBe(memorableDisplays[n - 4])
  })

  it('marks only Custom Password as approximate', () => {
    expect(isExactEntropy('strong', DEFAULT_OPTIONS)).toBe(false)
    for (const id of ['standard', 'memorable', 'pin', 'secret128', 'secret256'] as const) {
      expect(isExactEntropy(id, DEFAULT_OPTIONS)).toBe(true)
    }
  })
})

describe('test vectors', () => {
  it('is version 2 with Custom Password and Memorable metadata', () => {
    expect(vectors.version).toBe(2)
    expect(vectors.custom).toMatchObject({
      minLength: 6,
      maxLength: 32,
      defaultLength: 24,
      defaultIncludeSymbols: true,
    })
    expect(vectors.memorable).toMatchObject({
      minWordCount: 4,
      maxWordCount: 8,
      defaultWordCount: 6,
      suffixDigits: 3,
      capitalizeFirst: true,
      defaultSeparator: '-',
      separators: [' ', '-', '_'],
    })
  })

  it('covers lengths 6, 24 and 32 with symbols on and off', () => {
    const keys = vectors.custom.cases.map((c) => `${c.length}/${c.includeSymbols}`).sort()
    expect(keys).toEqual(['24/false', '24/true', '32/false', '32/true', '6/false', '6/true'])
  })

  it.each(vectors.custom.cases)('custom case %o matches', ({ length, includeSymbols, bits, display }) => {
    const options = { ...DEFAULT_OPTIONS, customLength: length, includeSymbols }
    expect(entropyBits('strong', options)).toBeCloseTo(bits, 3)
    expect(formatEntropy('strong', options)).toBe(display)
  })

  it('covers every Memorable word count', () => {
    expect(vectors.memorable.cases.map((c) => c.wordCount)).toEqual([4, 5, 6, 7, 8])
  })

  it.each(vectors.memorable.cases)('memorable case %o matches', ({ wordCount, bits, display }) => {
    for (const sep of SEPARATORS) {
      const options = { ...DEFAULT_OPTIONS, memorableWordCount: wordCount, memorableSeparator: sep }
      expect(entropyBits('memorable', options)).toBeCloseTo(bits, 3)
      expect(formatEntropy('memorable', options)).toBe(display)
    }
  })

  it('formatting cases cover every separator, leading zeros, repeats and hyphenated entries', () => {
    const f = vectors.memorable.formattingCases
    expect(new Set(f.map((c) => c.separator))).toEqual(new Set(SEPARATORS))
    expect(new Set(f.map((c) => c.suffix))).toEqual(new Set([0, 7, 42, 999]))
    expect(f.some((c) => new Set(c.wordIndices).size < c.wordIndices.length)).toBe(true)
    for (const w of ['Drop-down', 'Felt-tip', 'T-shirt', 'Yo-yo'])
      expect(f.some((c) => c.expected.includes(w))).toBe(true)
  })

  it.each(vectors.memorable.formattingCases)('formatting case $expected is generated', (c) => {
    const options = {
      ...DEFAULT_OPTIONS,
      memorableWordCount: c.wordIndices.length,
      memorableSeparator: c.separator as MemorableSeparator,
    }
    expect(generate('memorable', options, new ScriptedRandom([...c.wordIndices, c.suffix]))).toBe(c.expected)
  })
})
