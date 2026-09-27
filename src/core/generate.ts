import { formatSpec, type CharacterSpec, type FormatId, type HexSpec, type Options, type WordSpec } from './formats'
import { randomBytes, randomInt, secureRandom, shuffle, type RandomSource } from './random'
import { WORDLIST } from './wordlist'

/** Generates a secret. Throws InsecureRandomError if secure randomness is unavailable; never falls back. */
export function generate(id: FormatId, options: Options, rng: RandomSource = secureRandom): string {
  const spec = formatSpec(id, options)
  switch (spec.kind) {
    case 'chars':
      return generateChars(spec, rng)
    case 'words':
      return generateWords(spec, rng)
    case 'hex':
      return generateHex(spec, rng)
  }
}

function pick(rng: RandomSource, alphabet: string): string {
  return alphabet[randomInt(rng, alphabet.length)]
}

function generateChars(spec: CharacterSpec, rng: RandomSource): string {
  // 1. Fill every position from the base set.
  const chars = Array.from({ length: spec.length }, () => pick(rng, spec.base))
  if (spec.required.length > 0) {
    // 2. Shuffle the position indices and take the first k: distinct and uniform by construction
    //    (this replaces 2.0's biased "digitIndex + 1" collision rule).
    const positions = shuffle(
      rng,
      chars.map((_, i) => i),
    )
    // 3. Overwrite those positions from their required sets.
    spec.required.forEach((set, k) => {
      chars[positions[k]] = pick(rng, set)
    })
  }
  // 4. Group, if the format groups.
  return group(chars.join(''), spec.groupSize, spec.separator)
}

function group(value: string, size: number | undefined, separator: string | undefined): string {
  if (size === undefined || separator === undefined) return value
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size))
  return chunks.join(separator)
}

function generateWords(spec: WordSpec, rng: RandomSource): string {
  const words = Array.from({ length: spec.wordCount }, () => WORDLIST[randomInt(rng, WORDLIST.length)])
  const suffix = String(randomInt(rng, 10 ** spec.suffixDigits)).padStart(spec.suffixDigits, '0')
  return [...words, suffix].join(spec.separator)
}

function generateHex(spec: HexSpec, rng: RandomSource): string {
  return Array.from(randomBytes(rng, spec.byteCount), (b) => b.toString(16).padStart(2, '0')).join('')
}
