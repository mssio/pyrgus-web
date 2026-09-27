import { describe, expect, it } from 'vitest'
import { ScriptedRandom, SeededRandom } from '../../test-support/seeded-random'
import { entropyBits } from './entropy'
import {
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  FORMAT_GROUPS,
  FORMAT_IDS,
  FORMAT_LABELS,
  PIN_LENGTHS,
  formatSpec,
  isFormatId,
  isPinLength,
  type FormatId,
  type Options,
} from './formats'
import { generate } from './generate'

describe('formats', () => {
  it('lists six formats with Password as the default', () => {
    expect(FORMAT_IDS).toEqual(['standard', 'strong', 'memorable', 'pin', 'secret128', 'secret256'])
    expect(DEFAULT_FORMAT).toBe('standard')
    expect(DEFAULT_OPTIONS).toEqual({
      pinLength: 6,
      customLength: 24,
      includeSymbols: true,
      memorableWordCount: 6,
      memorableSeparator: '-',
    })
  })

  it('groups every format exactly once under Passwords and Secrets', () => {
    expect(FORMAT_GROUPS.map((g) => g.heading)).toEqual(['Passwords', 'Secrets'])
    expect(FORMAT_GROUPS.flatMap((g) => g.ids)).toEqual([...FORMAT_IDS])
  })

  it('labels every format', () => {
    expect(FORMAT_LABELS).toEqual({
      standard: 'Password',
      strong: 'Custom Password',
      memorable: 'Memorable',
      pin: 'PIN',
      secret128: 'Secret 128',
      secret256: 'Secret 256',
    })
  })

  it('PIN reads its length', () => {
    for (const pinLength of PIN_LENGTHS) {
      expect(formatSpec('pin', { ...DEFAULT_OPTIONS, pinLength })).toMatchObject({
        kind: 'chars',
        length: pinLength,
        required: [],
      })
    }
  })

  it('describes Password and the Secrets as documented', () => {
    expect(formatSpec('standard', DEFAULT_OPTIONS)).toMatchObject({
      kind: 'chars',
      length: 18,
      groupSize: 6,
      separator: '-',
    })
    expect(formatSpec('secret128', DEFAULT_OPTIONS)).toEqual({ kind: 'hex', byteCount: 16 })
    expect(formatSpec('secret256', DEFAULT_OPTIONS)).toEqual({ kind: 'hex', byteCount: 32 })
  })

  it('describes Memorable formatting as data', () => {
    expect(formatSpec('memorable', DEFAULT_OPTIONS)).toEqual({
      kind: 'words',
      wordCount: 6,
      suffixDigits: 3,
      separator: '-',
      capitalizeFirst: true,
    })
    expect(formatSpec('memorable', { ...DEFAULT_OPTIONS, memorableWordCount: 8, memorableSeparator: ' ' })).toEqual({
      kind: 'words',
      wordCount: 8,
      suffixDigits: 3,
      separator: ' ',
      capitalizeFirst: true,
    })
  })

  it('describes Custom Password with and without symbols', () => {
    expect(formatSpec('strong', DEFAULT_OPTIONS)).toMatchObject({ kind: 'chars', length: 24 })
    const off = formatSpec('strong', { ...DEFAULT_OPTIONS, customLength: 6, includeSymbols: false })
    expect(off).toMatchObject({ kind: 'chars', length: 6 })
    expect(off).not.toHaveProperty('groupSize')
  })

  it('guards stored values', () => {
    expect(isFormatId('secret256')).toBe(true)
    for (const bad of ['', 'Standard', 'secret512', null, undefined, 6]) expect(isFormatId(bad)).toBe(false)
    expect(PIN_LENGTHS.every(isPinLength)).toBe(true)
    for (const bad of [0, 5, 7, '6', NaN, null]) expect(isPinLength(bad)).toBe(false)
  })
})

const invalid = (field: keyof Options, value: unknown) => ({ ...DEFAULT_OPTIONS, [field]: value }) as unknown as Options

const INVALID: [FormatId, keyof Options, unknown][] = [
  ...[5, 33, 6.5, NaN, Infinity, -Infinity, '6', null, undefined].map(
    (v) => ['strong', 'customLength', v] as [FormatId, keyof Options, unknown],
  ),
  ...[0, 1, 'true', null, undefined].map((v) => ['strong', 'includeSymbols', v] as [FormatId, keyof Options, unknown]),
  ...[3, 9, 4.5, NaN, Infinity, -Infinity, '6', null, undefined].map(
    (v) => ['memorable', 'memorableWordCount', v] as [FormatId, keyof Options, unknown],
  ),
  ...['', '  ', '\t', '\n', '.', null, undefined].map(
    (v) => ['memorable', 'memorableSeparator', v] as [FormatId, keyof Options, unknown],
  ),
]

describe('formats — option validation', () => {
  it.each(INVALID)('%s rejects %s = %j before any draw', (id, field, value) => {
    const options = invalid(field, value)
    const rng = new ScriptedRandom([])
    expect(() => formatSpec(id, options)).toThrow(RangeError)
    expect(() => generate(id, options, rng)).toThrow(RangeError)
    expect(() => entropyBits(id, options)).toThrow(RangeError)
    expect(rng.consumed).toBe(0)
  })

  /** Every field except the ones the format reads, set to a different (sometimes invalid) value. */
  const UNRELATED: Record<FormatId, Partial<Record<keyof Options, unknown>>> = {
    standard: { pinLength: 4, customLength: 5, includeSymbols: 'x', memorableWordCount: 99, memorableSeparator: '.' },
    strong: { pinLength: 8, memorableWordCount: 3, memorableSeparator: '\t' },
    memorable: { pinLength: 4, customLength: 33, includeSymbols: null },
    pin: { customLength: NaN, includeSymbols: 0, memorableWordCount: 4.5, memorableSeparator: '' },
    secret128: { pinLength: 7, customLength: 6, includeSymbols: false, memorableWordCount: 8, memorableSeparator: '_' },
    secret256: { pinLength: 4, customLength: '6', memorableWordCount: null },
  }

  it.each(FORMAT_IDS)('%s ignores unrelated options', (id) => {
    const other = { ...DEFAULT_OPTIONS, ...UNRELATED[id] } as unknown as Options
    expect(formatSpec(id, other)).toEqual(formatSpec(id, DEFAULT_OPTIONS))
    expect(entropyBits(id, other)).toBe(entropyBits(id, DEFAULT_OPTIONS))
    expect(generate(id, other, new SeededRandom(42))).toBe(generate(id, DEFAULT_OPTIONS, new SeededRandom(42)))
  })
})
