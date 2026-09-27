// The only source of randomness in Pyrgus. See AGENTS.md → Security rules.

export interface RandomSource {
  /** An unsigned 32-bit integer, uniformly distributed. */
  nextUint32(): number
}

/** Thrown when the platform cannot provide cryptographically secure randomness. Never caught into a fallback. */
export class InsecureRandomError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InsecureRandomError'
  }
}

const BUFFER_WORDS = 1024 // 4 KB, well under getRandomValues' 65,536-byte limit
const TWO_POW_32 = 0x1_0000_0000

/** crypto.getRandomValues, buffered. Fails closed. */
export class SecureRandom implements RandomSource {
  #buffer = new Uint32Array(BUFFER_WORDS)
  #index = BUFFER_WORDS

  nextUint32(): number {
    if (this.#index >= BUFFER_WORDS) this.#refill()
    return this.#buffer[this.#index++]
  }

  #refill(): void {
    const cryptoApi = globalThis.crypto
    if (typeof cryptoApi?.getRandomValues !== 'function') {
      throw new InsecureRandomError('crypto.getRandomValues is unavailable')
    }
    try {
      cryptoApi.getRandomValues(this.#buffer)
    } catch (cause) {
      throw new InsecureRandomError('crypto.getRandomValues failed', { cause })
    }
    this.#index = 0
  }
}

export const secureRandom = new SecureRandom()

/** Uniform integer in [0, n) by rejection sampling: never a bare `x % n`. */
export function randomInt(rng: RandomSource, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > TWO_POW_32) {
    throw new RangeError(`randomInt: n must be an integer in [1, 2^32], got ${n}`)
  }
  const limit = TWO_POW_32 - (TWO_POW_32 % n) // = floor(2^32 / n) * n
  let x = rng.nextUint32()
  while (x >= limit) x = rng.nextUint32()
  return x % n
}

/** Fisher–Yates. Returns a new array. */
export function shuffle<T>(rng: RandomSource, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** `count` random bytes; each 32-bit draw supplies four bytes, least significant first. */
export function randomBytes(rng: RandomSource, count: number): Uint8Array {
  const out = new Uint8Array(count)
  for (let i = 0; i < count; i += 4) {
    const word = rng.nextUint32()
    for (let b = 0; b < 4 && i + b < count; b++) out[i + b] = (word >>> (8 * b)) & 0xff
  }
  return out
}
