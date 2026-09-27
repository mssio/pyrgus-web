import { expect } from 'vitest'

/** Pearson chi-squared statistic against a uniform expectation. */
export function chiSquared(observed: readonly number[]): number {
  const total = observed.reduce((sum, o) => sum + o, 0)
  const expected = total / observed.length
  return observed.reduce((sum, o) => sum + (o - expected) ** 2 / expected, 0)
}

/** Critical value at p = 0.001 (Wilson–Hilferty approximation, accurate to ~0.3 for df ≥ 2). */
export function chiSquaredCritical(df: number): number {
  const z = 3.090232
  const a = 2 / (9 * df)
  return df * (1 - a + z * Math.sqrt(a)) ** 3
}

/** Fails the test if `observed` is not plausibly uniform at p = 0.001. */
export function expectUniform(observed: readonly number[], label = 'distribution'): void {
  const statistic = chiSquared(observed)
  const critical = chiSquaredCritical(observed.length - 1)
  expect(statistic, `${label}: chi² ${statistic.toFixed(1)} ≥ critical ${critical.toFixed(1)}`).toBeLessThan(critical)
}

/** Histogram of integer values in [0, n). */
export function countBy(n: number, values: Iterable<number>): number[] {
  const counts = new Array<number>(n).fill(0)
  for (const v of values) counts[v]++
  return counts
}
