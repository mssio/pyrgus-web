const NAMES: Record<string, string> = {
  '-': 'dash',
  '!': 'exclamation mark',
  '@': 'at',
  '#': 'hash',
  $: 'dollar',
  '%': 'percent',
  '^': 'caret',
  '&': 'ampersand',
  '*': 'asterisk',
  _: 'underscore',
  '=': 'equals',
  '+': 'plus',
  '?': 'question mark',
}

/** Spoken form for screen readers: one character at a time, with case and symbols named. */
export function spell(secret: string): string {
  return [...secret].map((c) => NAMES[c] ?? (c >= 'A' && c <= 'Z' ? `capital ${c}` : c)).join(', ')
}
