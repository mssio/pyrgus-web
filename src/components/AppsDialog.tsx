import { useState } from 'react'
import { APP_STORE_URL } from '../config'
import { Badge } from './catalyst/badge'
import { Button } from './catalyst/button'
import { Dialog, DialogActions, DialogBody, DialogDescription, DialogTitle } from './catalyst/dialog'
import { Logo } from './Logo'
import { WidgetMockup } from './WidgetMockup'

const FEATURES = [
  {
    title: 'On-device',
    body: 'No account and no network. Every secret is generated on your iPhone, iPad or Mac.',
  },
  {
    title: 'A widget that never shows your secret',
    body: 'Tap from the Home Screen to open Pyrgus and copy immediately. The widget shows only a mask.',
  },
  { title: 'The clipboard clears itself', body: 'Copied secrets are cleared from the clipboard after 90 seconds.' },
  {
    title: 'Six formats',
    body: 'Passwords, custom passwords, memorable phrases, PINs, and 128- and 256-bit hex secrets.',
  },
]

/** The native-apps pill and the dialog it opens. Nothing about the apps renders in the page flow. */
export function AppsDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full py-1.5 pr-4 pl-2 text-sm/6 font-medium text-indigo-700 ring-1 ring-indigo-600/20 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:text-indigo-300 dark:ring-indigo-400/30 dark:hover:bg-indigo-500/10 dark:focus-visible:outline-indigo-400"
        >
          <Logo className="size-5 rounded-[5px]" />
          Pyrgus for iPhone, iPad &amp; Mac
        </button>
      </div>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        // Below 32rem (512px) tall there isn't room for chrome + a capped, independently-scrolling
        // body without collapsing the body to zero height. Below that threshold the panel takes its
        // natural height instead, and Catalyst's outer `fixed inset-0 overflow-y-auto` container
        // scrolls the whole dialog — the page behind stays scroll-locked either way.
        className="[@media(min-height:32rem)]:flex [@media(min-height:32rem)]:max-h-[calc(100dvh-1.5rem)] [@media(min-height:32rem)]:flex-col [@media(min-height:32rem)]:sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex shrink-0 items-center gap-4">
          <Logo className="size-14 rounded-xl shadow-sm sm:size-16 sm:rounded-2xl" />
          <div className="min-w-0">
            <Badge color="indigo">Available now · iPhone · iPad · Mac</Badge>
            <DialogTitle className="mt-2">Pyrgus for iPhone, iPad &amp; Mac</DialogTitle>
            <DialogDescription>On-device. No account, no net.</DialogDescription>
          </div>
        </div>
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
          <Button color="indigo" href={APP_STORE_URL}>
            Download on the App Store
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
