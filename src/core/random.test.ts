import { afterEach, describe, expect, it, vi } from 'vitest'
import { countBy, expectUniform } from '../../test-support/chi-squared'
import { ScriptedRandom, SeededRandom } from '../../test-support/seeded-random'
import { InsecureRandomError, SecureRandom, randomBytes, randomInt, shuffle } from './random'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('SecureRandom', () => {
  it('returns unsigned 32-bit integers', () => {
    const rng = new SecureRandom()
    for (let i = 0; i < 2000; i++) {
      const v = rng.nextUint32()
      expect(Number.isInteger(v) && v >= 0 && v <= 0xffffffff).toBe(true)
    }
  })

  it('refills a 4 KB buffer with one getRandomValues call per 1024 words', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues')
    const rng = new SecureRandom()
    for (let i = 0; i < 1024; i++) rng.nextUint32()
    expect(spy).toHaveBeenCalledTimes(1)
    expect((spy.mock.calls[0][0] as Uint32Array).byteLength).toBe(4096)
    rng.nextUint32()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('produces different streams from independent instances', () => {
    const a = new SecureRandom()
    const b = new SecureRandom()
    const streamA = Array.from({ length: 8 }, () => a.nextUint32())
    const streamB = Array.from({ length: 8 }, () => b.nextUint32())
    expect(streamA).not.toEqual(streamB)
  })

  it('fails closed when crypto is missing', () => {
    vi.stubGlobal('crypto', undefined)
    expect(() => new SecureRandom().nextUint32()).toThrow(InsecureRandomError)
  })

  it('fails closed when getRandomValues throws', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(() => new SecureRandom().nextUint32()).toThrow(InsecureRandomError)
  })
})

describe('randomInt', () => {
  it('rejects values in the biased zone instead of reducing them (n = 3)', () => {
    // 2^32 mod 3 = 1, so the acceptance limit is 2^32 - 1 and 0xffffffff must be redrawn.
    const rng = new ScriptedRandom([0xffffffff, 5])
    expect(randomInt(rng, 3)).toBe(2)
    expect(rng.consumed).toBe(2)
  })

  it('rejects values in the biased zone instead of reducing them (n = 7776)', () => {
    // 2^32 mod 7776 = 2560, so the limit is 4294964736; that value and above are redrawn.
    const rng = new ScriptedRandom([4294964736, 0xffffffff, 4294964735])
    expect(randomInt(rng, 7776)).toBe(7775)
    expect(rng.consumed).toBe(3)
  })

  it('rejects the biased suffix range for n = 1000', () => {
    // 2^32 mod 1000 = 296, so the limit is 4294967000; that value and above are redrawn.
    const rng = new ScriptedRandom([4294967000, 0xffffffff, 4294966999])
    expect(randomInt(rng, 1000)).toBe(999)
    expect(rng.consumed).toBe(3)
  })

  it('returns 0 for n = 1 using a single draw', () => {
    const rng = new ScriptedRandom([0xffffffff])
    expect(randomInt(rng, 1)).toBe(0)
    expect(rng.consumed).toBe(1)
  })

  it.each([0, -1, 1.5, Number.NaN, 2 ** 32 + 1])('throws RangeError for n = %s', (n) => {
    expect(() => randomInt(new SeededRandom(1), n)).toThrow(RangeError)
  })

  it.each([
    [3, 100_000],
    [100, 100_000],
    [1000, 100_000],
    [7776, 200_000],
  ])('is uniform for n = %i', (n, samples) => {
    const rng = new SeededRandom(n)
    expectUniform(
      countBy(
        n,
        Array.from({ length: samples }, () => randomInt(rng, n)),
      ),
      `randomInt(${n})`,
    )
  })
})

describe('shuffle', () => {
  it('returns a permutation and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(new SeededRandom(3), input)
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual(input)
  })

  it('makes all 6 permutations of 3 items equally likely', () => {
    const rng = new SeededRandom(11)
    const perms = ['abc', 'acb', 'bac', 'bca', 'cab', 'cba']
    const counts = new Array<number>(6).fill(0)
    for (let i = 0; i < 60_000; i++) counts[perms.indexOf(shuffle(rng, ['a', 'b', 'c']).join(''))]++
    expectUniform(counts, 'shuffle(3)')
  })
})

describe('randomBytes', () => {
  it('splits each 32-bit word into bytes, least significant first', () => {
    const rng = new ScriptedRandom([0x04030201, 0x08070605])
    expect(Array.from(randomBytes(rng, 6))).toEqual([1, 2, 3, 4, 5, 6])
    expect(rng.consumed).toBe(2)
  })

  it('returns exactly count bytes', () => {
    expect(randomBytes(new SeededRandom(1), 16)).toHaveLength(16)
    expect(randomBytes(new SeededRandom(1), 32)).toHaveLength(32)
  })
})
