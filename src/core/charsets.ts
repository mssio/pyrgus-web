export const LOWER = 'abcdefghijklmnopqrstuvwxyz'
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const DIGITS = '0123456789'
/** No quotes, backslash or backtick: values survive shell, CSV and JSON unescaped. */
export const SYMBOLS = '!@#$%^&*-_=+?'
export const HEX = '0123456789abcdef'

/** Standard format: drop l (vs 1, I), O and I (vs 0, 1, l), 0 and 1. 5/S, 8/B, 2/Z are kept on purpose. */
export const STANDARD_LOWER = 'abcdefghijkmnopqrstuvwxyz' // 25
export const STANDARD_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // 24
export const STANDARD_DIGITS = '23456789' // 8

export const STRONG_BASE = LOWER + UPPER + DIGITS + SYMBOLS // 75
