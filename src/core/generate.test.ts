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

  it('Strong: 24 chars from the 75-char base with every class present', () => {
    const rng = new SeededRandom(2)
    for (let i = 0; i < 2000; i++) {
      const pw = generate('strong', DEFAULT_OPTIONS, rng)
      expect(pw).toHaveLength(24)
      expect([...pw].every((c) => STRONG_BASE.includes(c))).toBe(true)
      for (const set of [LOWER, UPPER, DIGITS, SYMBOLS]) expect(count(pw, set)).toBeGreaterThanOrEqual(1)
    }
  })

  it('Memorable: four wordlist words then a zero-padded two-digit suffix', () => {
    const rng = new ScriptedRandom([0, 1, 7775, 3, 7])
    expect(generate('memorable', DEFAULT_OPTIONS, rng)).toBe(
      `${WORDLIST[0]}-${WORDLIST[1]}-${WORDLIST[7775]}-${WORDLIST[3]}-07`,
    )
  })

  it('Memorable: always ends in -NN', () => {
    const rng = new SeededRandom(3)
    for (let i = 0; i < 500; i++) expect(generate('memorable', DEFAULT_OPTIONS, rng)).toMatch(/^[a-z-]+-\d{2}$/)
  })

  it.each(PIN_LENGTHS)('PIN %i: exactly that many digits', (pinLength) => {
    const rng = new SeededRandom(pinLength)
    for (let i = 0; i < 500; i++) {
      expect(generate('pin', { pinLength }, rng)).toMatch(new RegExp(`^\\d{${pinLength}}$`))
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
    const pins = Array.from({ length: 20_000 }, () => generate('pin', { pinLength }, rng))
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
