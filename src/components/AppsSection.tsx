import { Badge } from './catalyst/badge'
import { PhoneMockup } from './PhoneMockup'
import { WidgetMockup } from './WidgetMockup'

const FEATURES = [
  {
    title: 'On-device',
    body: 'No account and no network. Every secret is generated on your iPhone, iPad or Mac.',
  },
  {
    title: 'A widget that never shows your secret',
    body: 'Tap to copy from the Home Screen. The widget shows only a mask and “Copied”.',
  },
  { title: 'The clipboard clears itself', body: 'Copied secrets are cleared from the clipboard after 90 seconds.' },
  {
    title: 'Six formats',
    body: 'Passwords, memorable phrases, PINs, and 128- and 256-bit hex secrets.',
  },
]

export function AppsSection() {
  return (
    <section
      id="apps"
      aria-labelledby="apps-heading"
      className="mx-auto mt-24 max-w-5xl scroll-mt-8 px-4 pb-24 sm:px-6"
    >
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Badge color="indigo">Coming soon · iPhone · iPad · Mac</Badge>
          <h2
            id="apps-heading"
            className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-white"
          >
            Pyrgus is coming to iPhone, iPad &amp; Mac
          </h2>
          <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">On-device. No account, no net.</p>
          <dl className="mt-10 space-y-6">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <dt className="font-semibold text-zinc-950 dark:text-white">{f.title}</dt>
                <dd className="mt-1 text-zinc-600 dark:text-zinc-400">{f.body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative flex justify-center">
          <PhoneMockup className="w-64 sm:w-72" />
          <WidgetMockup className="absolute bottom-10 left-0 sm:left-6" />
        </div>
      </div>
    </section>
  )
}
