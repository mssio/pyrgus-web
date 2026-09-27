import { formatSpec, type CharacterSpec, type FormatId, type Options } from './formats'
import { WORDLIST } from './wordlist'

/**
 * Bits of entropy, computed from the spec data. Exact (log2 of the number of equally likely outputs) for every
 * format except Custom Password, whose figure is an approximate upper bound: see isExactEntropy.
 */
export function entropyBits(id: FormatId, options: Options): number {
  const spec = formatSpec(id, options)
  switch (spec.kind) {
    case 'hex':
      return spec.byteCount * 8
    case 'words':
      return spec.wordCount * Math.log2(WORDLIST.length) + spec.suffixDigits * Math.log2(10)
    case 'chars':
      return charsEntropy(spec)
  }
}

/**
 * False when required sets overlap the base set (Custom Password, with or without symbols): the figure is then
 * length × log2(base), an approximate upper bound, since required classes make the output non-uniform.
 */
export function isExactEntropy(id: FormatId, options: Options): boolean {
  const spec = formatSpec(id, options)
  return spec.kind !== 'chars' || requiredSetsAreDisjoint(spec)
}

/** Display form: "90.1" (exact), "128" (exact integer), "~149" (approximate, rounded down). */
export function formatEntropy(id: FormatId, options: Options): string {
  const bits = entropyBits(id, options)
  if (!isExactEntropy(id, options)) return `~${Math.floor(bits)}`
  return Number.isInteger(bits) ? String(bits) : bits.toFixed(1)
}

function requiredSetsAreDisjoint(spec: CharacterSpec): boolean {
  const sets = [spec.base, ...spec.required]
  const seen = new Set<string>()
  for (const set of sets) {
    for (const c of set) {
      if (seen.has(c)) return false
      seen.add(c)
    }
  }
  return true
}

function charsEntropy(spec: CharacterSpec): number {
  const k = spec.required.length
  if (!requiredSetsAreDisjoint(spec)) {
    // Overlapping sets: an upper bound that treats every position as drawn from the base set.
    return spec.length * Math.log2(spec.base.length)
  }
  // Exact: ordered choice of k distinct positions × one character per required set × base for the rest.
  let bits = (spec.length - k) * Math.log2(spec.base.length)
  for (let i = 0; i < k; i++) bits += Math.log2(spec.length - i) + Math.log2(spec.required[i].length)
  return bits
}
