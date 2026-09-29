import { SUPPORT_EMAIL } from '../config'

export const SUPPORT_TOPICS = ['Question', 'Bug report', 'Feature request', 'Other'] as const
export const SUPPORT_PRODUCTS = ['Pyrgus Web', 'iPhone', 'iPad', 'Mac'] as const
export type SupportTopic = (typeof SUPPORT_TOPICS)[number]
export type SupportProduct = (typeof SUPPORT_PRODUCTS)[number]

/** Some mail apps and browsers truncate very long mailto URLs. */
export const SUPPORT_MESSAGE_MAX = 2000

export function isSupportTopic(value: string): value is SupportTopic {
  return (SUPPORT_TOPICS as readonly string[]).includes(value)
}

export function isSupportProduct(value: string): value is SupportProduct {
  return (SUPPORT_PRODUCTS as readonly string[]).includes(value)
}

export function supportSubject(topic: SupportTopic, product: SupportProduct) {
  return `Pyrgus: ${topic} (${product})`
}

// encodeURIComponent throws URIError on an unpaired surrogate. (String.prototype.toWellFormed is ES2024;
// this project's lib is ES2023.)
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g

/**
 * The recipient is a constant; user input only ever appears percent-encoded as the value of `subject`
 * or `body`, so it cannot add cc, bcc, to or any other header.
 */
export function supportMailto(topic: SupportTopic, product: SupportProduct, message: string) {
  if (!isSupportTopic(topic)) throw new RangeError(`Unknown support topic: ${topic}`)
  if (!isSupportProduct(product)) throw new RangeError(`Unknown support product: ${product}`)
  if (message.trim() === '') throw new RangeError('The support message is empty')

  // RFC 6068: line breaks in a mailto body are CRLF.
  const body = message.replace(LONE_SURROGATE, '�').replace(/\r\n|\r|\n/g, '\r\n')
  const subject = supportSubject(topic, product)
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
