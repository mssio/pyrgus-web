import { describe, expect, it } from 'vitest'
import vectors from './test-vectors.json'
import { WORDLIST } from './wordlist'

/** Index → EFF dice roll, e.g. 0 → "11111", 7775 → "66666". */
function diceRoll(index: number): string {
  let roll = ''
  for (let digit = 0; digit < 5; digit++) {
    roll = String((index % 6) + 1) + roll
    index = Math.floor(index / 6)
  }
  return roll
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

describe('WORDLIST', () => {
  it('has 7,776 unique entries, first and last as published', () => {
    expect(WORDLIST).toHaveLength(vectors.wordlist.count)
    expect(new Set(WORDLIST).size).toBe(WORDLIST.length)
    expect(WORDLIST[0]).toBe(vectors.wordlist.first)
    expect(WORDLIST.at(-1)).toBe(vectors.wordlist.last)
  })

  it('is lowercase ASCII, with exactly the four hyphenated EFF entries', () => {
    for (const word of WORDLIST) expect(word).toMatch(/^[a-z]+(-[a-z]+)?$/)
    expect(WORDLIST.filter((w) => w.includes('-'))).toEqual(['drop-down', 'felt-tip', 't-shirt', 'yo-yo'])
  })

  it('is frozen', () => {
    expect(Object.isFrozen(WORDLIST)).toBe(true)
  })

  it("reconstructs EFF's published file byte-for-byte", async () => {
    const file = WORDLIST.map((word, i) => `${diceRoll(i)}\t${word}\n`).join('')
    expect(await sha256Hex(file)).toBe(vectors.wordlist.sha256)
  })
})
