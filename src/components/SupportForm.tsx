import { useState } from 'react'
import { SUPPORT_EMAIL } from '../config'
import {
  isSupportProduct,
  isSupportTopic,
  SUPPORT_MESSAGE_MAX,
  SUPPORT_PRODUCTS,
  SUPPORT_TOPICS,
  supportMailto,
} from '../lib/supportMail'
import { Button } from './catalyst/button'
import { Field, FieldGroup, Fieldset, Label } from './catalyst/fieldset'
import { Select } from './catalyst/select'
import { Text, TextLink } from './catalyst/text'
import { Textarea } from './catalyst/textarea'

// Tests pass a spy instead: `location` cannot be stubbed in jsdom or in the browser.
const openInMailApp = (url: string) => window.location.assign(url)

function SupportEmailLink() {
  return <TextLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</TextLink>
}

export function SupportForm({ open = openInMailApp }: { open?: (url: string) => void }) {
  const [topic, setTopic] = useState('')
  const [product, setProduct] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    // Never a real submission: the CSP's form-action 'none' would block it, and there is nowhere to send it.
    event.preventDefault()
    const form = event.currentTarget
    const messageField = form.elements.namedItem('message') as HTMLTextAreaElement
    // `required` accepts a message of only spaces.
    messageField.setCustomValidity(message.trim() === '' ? 'Please enter a message.' : '')
    if (!form.reportValidity()) return
    if (!isSupportTopic(topic) || !isSupportProduct(product)) return
    open(supportMailto(topic, product, message))
    setSent(true)
  }

  return (
    <form className="mt-8" onSubmit={handleSubmit}>
      <Fieldset>
        <FieldGroup>
          <Field>
            <Label>Topic</Label>
            <Select name="topic" required value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="" disabled>
                Choose a topic…
              </option>
              {SUPPORT_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Product</Label>
            <Select name="product" required value={product} onChange={(e) => setProduct(e.target.value)}>
              <option value="" disabled>
                Choose a product…
              </option>
              {SUPPORT_PRODUCTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Message</Label>
            <Textarea
              name="message"
              required
              rows={8}
              maxLength={SUPPORT_MESSAGE_MAX}
              value={message}
              onChange={(e) => {
                e.currentTarget.setCustomValidity('')
                setMessage(e.target.value)
              }}
            />
          </Field>
        </FieldGroup>
      </Fieldset>

      <Button type="submit" className="mt-8">
        Open in Mail app
      </Button>

      <div role="status" className="mt-4">
        {sent && (
          <Text>
            If your mail app didn't open, email <SupportEmailLink /> directly.
          </Text>
        )}
      </div>

      <Text className="mt-6">
        Or email <SupportEmailLink />.
      </Text>
    </form>
  )
}
