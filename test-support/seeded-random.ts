// Test-only RandomSource implementations. Never import from src/ production code.

/** Structural copy of src/core/random.ts's RandomSource, so this file has no dependency on it. */
interface RandomSource {
  nextUint32(): number
}

/** Deterministic 32-bit generator (mulberry32). Statistically fine for tests; NOT secure. */
export class SeededRandom implements RandomSource {
  #state: number

  constructor(seed: number) {
    this.#state = seed >>> 0
  }

  nextUint32(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0
    let t = this.#state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }
}

/** Returns the given values in order, then throws. Lets a test control every draw exactly. */
export class ScriptedRandom implements RandomSource {
  #values: readonly number[]
  #index = 0

  constructor(values: readonly number[]) {
    this.#values = values
  }

  nextUint32(): number {
    if (this.#index >= this.#values.length) {
      throw new Error(`ScriptedRandom exhausted after ${this.#values.length} values`)
    }
    return this.#values[this.#index++]
  }

  get consumed(): number {
    return this.#index
  }
}
