import { useState } from 'react'
import { Badge } from './catalyst/badge'
import { Button } from './catalyst/button'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from './catalyst/dialog'
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

/** The "coming soon" pill and the dialog it opens. Nothing about the apps renders in the page flow. */
export function AppsDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex rounded-full px-4 py-1.5 text-sm/6 font-medium text-indigo-700 ring-1 ring-indigo-600/20 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-indigo-300 dark:ring-indigo-400/30 dark:hover:bg-indigo-500/10 dark:focus-visible:outline-indigo-400"
        >
          Pyrgus for iPhone, iPad &amp; Mac — coming soon
        </button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        className="flex max-h-[calc(100dvh-1.5rem)] flex-col sm:max-h-[calc(100dvh-2rem)]"
      >
        <Badge color="indigo" className="shrink-0 self-start">
          Coming soon · iPhone · iPad · Mac
        </Badge>
        <DialogTitle className="mt-4 shrink-0">Pyrgus is coming to iPhone, iPad &amp; Mac</DialogTitle>
        <DialogDescription className="shrink-0">On-device. No account, no net.</DialogDescription>
        <DialogBody className="min-h-0 overflow-y-auto">
          <div className="flex justify-center">
            <WidgetMockup />
          </div>
          <dl className="mt-6 space-y-4">
            {FEATURES.map((f) => (
              <div key={f.title}>
                <dt className="text-sm/6 font-semibold text-zinc-950 dark:text-white">{f.title}</dt>
                <dd className="text-sm/6 text-zinc-600 dark:text-zinc-400">{f.body}</dd>
              </div>
            ))}
          </dl>
        </DialogBody>
        <DialogActions className="shrink-0">
          <Button plain onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
