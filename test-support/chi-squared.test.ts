import { describe, expect, it } from 'vitest'
import { chiSquared, chiSquaredCritical, countBy } from './chi-squared'
import { ScriptedRandom, SeededRandom } from './seeded-random'

describe('chiSquared', () => {
  it('is zero for a perfectly flat histogram', () => {
    expect(chiSquared([10, 10, 10])).toBe(0)
  })

  it('matches a hand-computed value', () => {
    expect(chiSquared([20, 0])).toBe(20)
  })
})

describe('chiSquaredCritical', () => {
  it.each([
    [9, 27.877],
    [15, 37.697],
    [17, 40.79],
  ])('approximates the p = 0.001 table value for df = %i', (df, table) => {
    expect(Math.abs(chiSquaredCritical(df) - table)).toBeLessThan(0.3)
  })
})

describe('countBy', () => {
  it('builds a histogram', () => {
    expect(countBy(3, [0, 2, 2, 1, 2])).toEqual([1, 1, 3])
  })
})

describe('SeededRandom', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = new SeededRandom(1)
    const b = new SeededRandom(1)
    const c = new SeededRandom(2)
    const first = [a.nextUint32(), a.nextUint32()]
    expect([b.nextUint32(), b.nextUint32()]).toEqual(first)
    expect([c.nextUint32(), c.nextUint32()]).not.toEqual(first)
  })

  it('returns unsigned 32-bit integers', () => {
    const rng = new SeededRandom(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextUint32()
      expect(Number.isInteger(v) && v >= 0 && v <= 0xffffffff).toBe(true)
    }
  })
})

describe('ScriptedRandom', () => {
  it('replays values, counts consumption, then throws', () => {
    const rng = new ScriptedRandom([5, 6])
    expect(rng.nextUint32()).toBe(5)
    expect(rng.nextUint32()).toBe(6)
    expect(rng.consumed).toBe(2)
    expect(() => rng.nextUint32()).toThrow('exhausted')
  })
})
