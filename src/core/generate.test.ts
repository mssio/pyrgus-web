import { describe, expect, it } from 'vitest'
import { countBy, expectUniform } from '../../test-support/chi-squared'
import { ScriptedRandom, SeededRandom } from '../../test-support/seeded-random'
import { DIGITS, LOWER, STANDARD_DIGITS, STANDARD_LOWER, STANDARD_UPPER, STRONG_BASE, SYMBOLS, UPPER } from './charsets'
import { DEFAULT_OPTIONS, FORMAT_IDS, PIN_LENGTHS } from './formats'
import { generate } from './generate'
import { randomInt, type RandomSource } from './random'
import { WORDLIST } from './wordlist'

const count = (s: string, set: string) => [...s].filter((c) => set.includes(c)).length

describe('generate — shape', () => {
  it('Standard: 18 chars in 6-6-6, exactly one uppercase and one digit, no ambiguous characters', () => {
    const rng = new SeededRandom(1)
    for (let i = 0; i < 2000; i++) {
      const pw = generate('standard', DEFAULT_OPTIONS, rng)
      expect(pw).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
      const raw = pw.replaceAll('-', '')
      expect(count(raw, STANDARD_UPPER)).toBe(1)
      expect(count(raw, STANDARD_DIGITS)).toBe(1)
      expect(count(raw, STANDARD_LOWER)).toBe(16)
      expect(raw).not.toMatch(/[lOI01]/)
    }
  })

  it('Custom Password: 24 chars from the 75-char base with every class present by default', () => {
    const rng = new SeededRandom(2)
    for (let i = 0; i < 2000; i++) {
      const pw = generate('strong', DEFAULT_OPTIONS, rng)
      expect(pw).toHaveLength(24)
      expect([...pw].every((c) => STRONG_BASE.includes(c))).toBe(true)
      for (const set of [LOWER, UPPER, DIGITS, SYMBOLS]) expect(count(pw, set)).toBeGreaterThanOrEqual(1)
    }
  })

  it('Memorable: six capitalized entries then a hyphen and a zero-padded three-digit suffix by default', () => {
    expect(generate('memorable', DEFAULT_OPTIONS, new ScriptedRandom([0, 0, 0, 0, 0, 0, 7]))).toBe(
      'Abacus-Abacus-Abacus-Abacus-Abacus-Abacus-007',
    )
  })

  it.each(PIN_LENGTHS)('PIN %i: exactly that many digits', (pinLength) => {
    const rng = new SeededRandom(pinLength)
    for (let i = 0; i < 500; i++) {
      expect(generate('pin', { ...DEFAULT_OPTIONS, pinLength }, rng)).toMatch(new RegExp(`^\\d{${pinLength}}$`))
    }
  })

  it.each([
    ['secret128', 32],
    ['secret256', 64],
  ] as const)('%s: %i lowercase hex characters, no separators', (id, length) => {
    const rng = new SeededRandom(4)
    for (let i = 0; i < 500; i++)
      expect(generate(id, DEFAULT_OPTIONS, rng)).toMatch(new RegExp(`^[0-9a-f]{${length}}$`))
  })

  it('hex encodes bytes in order, lowercase, zero-padded', () => {
    const rng = new ScriptedRandom([0x04030201, 0x08070605, 0x0c0b0a09, 0x100f0e0d])
    expect(generate('secret128', DEFAULT_OPTIONS, rng)).toBe('0102030405060708090a0b0c0d0e0f10')
  })
})

describe('generate — determinism', () => {
  it.each(FORMAT_IDS)('%s is reproducible with the same seed', (id) => {
    expect(generate(id, DEFAULT_OPTIONS, new SeededRandom(42))).toBe(
      generate(id, DEFAULT_OPTIONS, new SeededRandom(42)),
    )
    expect(generate(id, DEFAULT_OPTIONS, new SeededRandom(42))).not.toBe(
      generate(id, DEFAULT_OPTIONS, new SeededRandom(43)),
    )
  })

  it('uses the secure generator by default', () => {
    expect(generate('standard', DEFAULT_OPTIONS)).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
  })
})

/** Positions (0–17) of the uppercase letter and the digit in an ungrouped Standard password. */
function standardPositions(pw: string): { upper: number; digit: number } {
  const raw = [...pw.replaceAll('-', '')]
  return {
    upper: raw.findIndex((c) => STANDARD_UPPER.includes(c)),
    digit: raw.findIndex((c) => STANDARD_DIGITS.includes(c)),
  }
}

/** Offset of the digit from the uppercase letter, 1–17, mapped to a 0–16 bin. */
const offsetBin = ({ upper, digit }: { upper: number; digit: number }) => ((digit - upper + 18) % 18) - 1

describe('generate — uniformity', () => {
  const SAMPLES = 100_000

  it('Standard: uppercase position, digit position and their offset are all flat', () => {
    const rng = new SeededRandom(2026)
    const samples = Array.from({ length: SAMPLES }, () => standardPositions(generate('standard', DEFAULT_OPTIONS, rng)))
    expectUniform(
      countBy(
        18,
        samples.map((s) => s.upper),
      ),
      'uppercase position',
    )
    expectUniform(
      countBy(
        18,
        samples.map((s) => s.digit),
      ),
      'digit position',
    )
    expectUniform(countBy(17, samples.map(offsetBin)), 'digit − uppercase offset')
  })

  it("the offset test detects 2.0's collision bias (proves the test has power)", () => {
    // 2.0: pick both positions independently; on collision, digit = (digit + 1) % 18.
    const legacy = (rng: RandomSource) => {
      const upper = randomInt(rng, 18)
      let digit = randomInt(rng, 18)
      if (digit === upper) digit = (digit + 1) % 18
      return { upper, digit }
    }
    const rng = new SeededRandom(2026)
    const offsets = countBy(
      17,
      Array.from({ length: SAMPLES }, () => offsetBin(legacy(rng))),
    )
    expect(() => expectUniform(offsets, 'legacy offset')).toThrow()
  })

  it('hex nibbles are flat across both Secret formats', () => {
    const rng = new SeededRandom(99)
    const nibbles: number[] = []
    for (let i = 0; i < 5_000; i++) {
      for (const c of generate('secret128', DEFAULT_OPTIONS, rng) + generate('secret256', DEFAULT_OPTIONS, rng)) {
        nibbles.push(parseInt(c, 16))
      }
    }
    expectUniform(countBy(16, nibbles), 'hex nibbles')
  })

  it.each(PIN_LENGTHS)('PIN %i: digits are flat at every position', (pinLength) => {
    const rng = new SeededRandom(pinLength * 1000)
    const pins = Array.from({ length: 20_000 }, () => generate('pin', { ...DEFAULT_OPTIONS, pinLength }, rng))
    for (let pos = 0; pos < pinLength; pos++) {
      expectUniform(
        countBy(
          10,
          pins.map((p) => Number(p[pos])),
        ),
        `PIN ${pinLength} position ${pos}`,
      )
    }
  })
})

const CUSTOM_LENGTHS = Array.from({ length: 27 }, (_, i) => i + 6)
const CUSTOM_CASES = CUSTOM_LENGTHS.flatMap((length) => [true, false].map((symbols) => [length, symbols] as const))

describe('generate — Custom Password options', () => {
  it.each(CUSTOM_CASES)('length %i, symbols %s: exact length, alphabet and required classes', (length, symbols) => {
    const rng = new SeededRandom(length * 2 + Number(symbols))
    const alphabet = symbols ? STRONG_BASE : LOWER + UPPER + DIGITS
    expect(alphabet).toHaveLength(symbols ? 75 : 62)
    const options = { ...DEFAULT_OPTIONS, customLength: length, includeSymbols: symbols }
    for (let i = 0; i < 100; i++) {
      const pw = generate('strong', options, rng)
      expect(pw).toHaveLength(length)
      expect([...pw].every((c) => alphabet.includes(c))).toBe(true)
      for (const set of [LOWER, UPPER, DIGITS]) expect(count(pw, set)).toBeGreaterThanOrEqual(1)
      if (symbols) expect(count(pw, SYMBOLS)).toBeGreaterThanOrEqual(1)
      else expect(count(pw, SYMBOLS)).toBe(0)
    }
  })
})

const SEPARATORS = [' ', '-', '_'] as const
const WORD_COUNTS = [4, 5, 6, 7, 8]
const capitalize = (w: string) => w[0].toUpperCase() + w.slice(1)
const HYPHENATED = ['drop-down', 'felt-tip', 't-shirt', 'yo-yo'].map((w) => WORDLIST.indexOf(w))
/** Repeated index 0, all four internally hyphenated entries and both ends of the list. */
const INDICES = [0, 0, ...HYPHENATED, 1234, 7775]

describe('generate — Memorable options', () => {
  it('finds all four internally hyphenated entries', () => {
    expect(HYPHENATED.every((i) => i >= 0)).toBe(true)
  })

  it('keeps internal hyphens intact when joining with another separator', () => {
    const options = { ...DEFAULT_OPTIONS, memorableWordCount: 4, memorableSeparator: '_' as const }
    expect(generate('memorable', options, new ScriptedRandom([...HYPHENATED, 0]))).toBe(
      'Drop-down_Felt-tip_T-shirt_Yo-yo_000',
    )
  })

  const cases = WORD_COUNTS.flatMap((n) =>
    SEPARATORS.flatMap((sep) => [0, 7, 42, 999].map((suffix) => [n, sep, suffix] as const)),
  )

  it.each(cases)('%i words joined by %j with suffix %i', (n, sep, suffix) => {
    const indices = INDICES.slice(0, n)
    const rng = new ScriptedRandom([...indices, suffix])
    const expected = [...indices.map((i) => capitalize(WORDLIST[i])), String(suffix).padStart(3, '0')].join(sep)
    const options = { ...DEFAULT_OPTIONS, memorableWordCount: n, memorableSeparator: sep }
    expect(generate('memorable', options, rng)).toBe(expected)
    expect(rng.consumed).toBe(n + 1)
  })

  const combos = WORD_COUNTS.flatMap((n) => SEPARATORS.map((sep) => [n, sep] as const))
  const words = new Set(WORDLIST)

  it.each(combos)('%i words joined by %j: sampled entries, joins and suffix are well formed', (n, sep) => {
    const rng = new SeededRandom(n * 10 + SEPARATORS.indexOf(sep))
    const options = { ...DEFAULT_OPTIONS, memorableWordCount: n, memorableSeparator: sep }
    const escaped = sep.replace(/[-]/g, '\\-')
    // A join is the separator followed by a capitalized entry or the suffix; entries' own hyphens precede lowercase.
    const join = new RegExp(`${escaped}(?=[A-Z\\d])`)
    for (let i = 0; i < 200; i++) {
      const pw = generate('memorable', options, rng)
      expect(pw.startsWith(sep)).toBe(false)
      const parts = pw.split(join)
      expect(parts).toHaveLength(n + 1)
      expect(parts.at(-1)).toMatch(/^\d{3}$/)
      for (const entry of parts.slice(0, -1)) {
        expect(entry[0]).toMatch(/[A-Z]/)
        expect(words.has(entry[0].toLowerCase() + entry.slice(1))).toBe(true)
      }
    }
  })

  it('rejects biased-zone draws for both the words and the suffix', () => {
    // Limits: 7776 → 4294964736, 1000 → 4294967000. Values at or above are redrawn, never reduced.
    const rng = new ScriptedRandom([4294964736, 0, 0, 0, 0, 0, 0, 4294967000, 7])
    expect(generate('memorable', DEFAULT_OPTIONS, rng)).toBe('Abacus-Abacus-Abacus-Abacus-Abacus-Abacus-007')
    expect(rng.consumed).toBe(9)
  })
})
