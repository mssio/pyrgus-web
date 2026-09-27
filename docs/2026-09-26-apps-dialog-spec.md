# Pyrgus Web — Apps Dialog and Centered Generator — Design

**Date:** 2026-09-26
**Status:** Draft, awaiting review.
**Amends:** `docs/2026-09-26-pyrgus-web-spec.md` (the binding spec). The amendments listed under
[Binding spec changes](#binding-spec-changes) are applied to it in the same commit as the code, per
`AGENTS.md`.

## Summary

The page shows only the generator. The "coming soon" apps section below it moves into a dialog,
opened from the existing pill. The generator column grows slightly and sits in the vertical centre
of the space between the header and the footer.

## Intent

**What the user asked for:**

- The "coming soon" apps content lives in a dialog instead of a section under the password.
- The generator is a little bigger and closer to the centre of the screen.
- "Bigger" means the card and the secret; phones stay as they are today.
- The dialog is compact: chip, heading, subheading, the four feature points and the widget mockup.
  The phone mockup is dropped.

**Assumed (confirm on review):**

- "Toward the centre" means vertical centring between header and footer, on every viewport size.
  When the viewport is too short for the card, the page scrolls as it does today.

**Success looks like:** on load, the page is the header, a centred generator, one pill and the
footer. Nothing about the apps competes with the password until the user asks for it.

## Non-goals

- A deep link to the dialog (`/#apps` opening it on load). The `#apps` anchor is removed.
- Any change to generation, clipboard, preferences, entropy, the CSP or other headers.
- Any change to the dialog's copy beyond what is already in the apps section.
- App Store badges or links (still not allowed until the apps ship).

## Layout — `src/App.tsx`

- `<main>` becomes `flex flex-1 flex-col justify-center`, with vertical padding (`py-8`), replacing
  the current top padding (`pt-6 sm:pt-12`). The shell is already `flex min-h-full flex-col`, so the
  generator is centred in the space the header and footer leave.
- `<main>` contains `<GeneratorCard />` followed by `<AppsDialog />` (which renders the pill). No
  apps content is rendered in the page flow.

## Generator size — `GeneratorCard.tsx`, `SecretDisplay.tsx`

| Property | Today | New (≥ 640 px, `sm:`) | Below 640 px |
|---|---|---|---|
| Column max width | `max-w-md` (28rem) | `sm:max-w-lg` (32rem) | unchanged |
| Card padding | `p-6` | `sm:p-8` | unchanged |
| Secret type | `text-2xl/9` (24 px) | `sm:text-3xl/10` (30 px) | unchanged |

The secret still wraps and never truncates. The existing 320 px Playwright check covers the phone
size, which is unchanged.

`GeneratorCard` no longer renders the pill; it contains only the generator.

## Apps dialog — `src/components/AppsDialog.tsx`

One component owns the open state (`useState(false)`) and renders two things:

1. **The pill.** A `<button type="button">` with the pill's current classes, labelled
   "Pyrgus for iPhone, iPad & Mac — coming soon". The "↓" is dropped (it no longer scrolls
   anywhere). It sits centred below the card, where the link is today (`mt-6 text-center`).
2. **The dialog.** Catalyst `Dialog` (size `lg`), `open={open}`, `onClose={() => setOpen(false)}`:
   - `Badge` "Coming soon · iPhone · iPad · Mac"
   - `DialogTitle` "Pyrgus is coming to iPhone, iPad & Mac" (the dialog's accessible name)
   - `DialogDescription` "On-device. No account, no net."
   - `DialogBody`: the `WidgetMockup` (centred, still `aria-hidden`), then the four feature points
     as the existing `<dl>`, with the same wording as today's `FEATURES`.
   - `DialogActions`: a **Close** button (Catalyst `Button`, `plain`) that closes the dialog.

**Behaviour from Headless UI, not reimplemented:** focus moves into the dialog on open; Tab is
trapped inside; Escape and a backdrop click close it; focus returns to the pill on close; the page
behind is inert and scroll-locked.

**Mobile:** Catalyst's dialog renders as a bottom sheet below 640 px. Without the phone mockup the
content is expected to fit a 320 × 640 viewport; the visual check confirms it. On a shorter screen
the dialog's own container scrolls (Catalyst default), never the page behind it.

### Catalyst component — `src/components/catalyst/dialog.tsx`

Copied from the Catalyst TypeScript kit in `tmp/catalyst-ui-kit/typescript/dialog.tsx`, logic
unedited. Its only imports are `@headlessui/react`, `clsx`, `react` types and `./text`, all of
which are already present. No new dependency. It falls under the existing `src/components/catalyst/`
licence exclusion.

## Removed

- `src/components/AppsSection.tsx`: its content moves to `AppsDialog.tsx`.
- `src/components/PhoneMockup.tsx` and `src/assets/phone-frame.svg`: no longer used. With them goes
  the fixed-sample rule (`SAMPLE_SECRET`) and its test, since no mockup renders a secret any more.
- The `#apps` section id and the pill's `href="#apps"`.

## Security

- No change to `vercel.json` or the CSP.
- Headless UI renders the dialog through a portal and sets scroll-lock styles through the CSSOM
  (`element.style`), which `style-src 'self'` permits; it inserts no inline `<style>`, no `style="…"`
  markup and no HTML strings, so Trusted Types is unaffected. The Playwright check below proves this
  in a real browser rather than relying on this reasoning.
- The dialog shows no generated value. The widget mockup shows only its fixed mask.

## Testing

**`src/App.test.tsx`** (jsdom), replacing the apps-section and phone-mockup assertions:

- The pill is a button named "Pyrgus for iPhone, iPad & Mac — coming soon", and no dialog is
  present on load.
- Clicking the pill opens a `dialog` named "Pyrgus is coming to iPhone, iPad & Mac" containing the
  chip, the subheading and all four feature titles; the widget mockup inside it is `aria-hidden`.
- Pressing Escape closes the dialog and focus returns to the pill.
- The **Close** button closes the dialog.
- The existing header, footer and link assertions stay.

**`e2e/smoke.spec.ts`** (Playwright, production headers via `preview`):

- A new test opens the dialog, checks it is visible, closes it with Escape, and asserts zero CSP
  or Trusted Types violations and no console errors.
- The existing 320 px wrapping test is unchanged and must still pass.

**Visual check** (manual, before commit): light and dark themes at 320 px, 768 px and 1280 px. The
generator is vertically centred and the dialog fits without clipping.

Done means `lint`, `build`, `test` and `test:e2e` all pass.

## Binding spec changes

Applied to `docs/2026-09-26-pyrgus-web-spec.md` in the implementation commit:

1. **Summary:** "Below the generator, a 'coming soon' section introduces…" becomes "A pill below the
   generator opens a 'coming soon' dialog introducing…".
2. **Stack:** the Tailwind Plus Pocket bullet is removed (nothing Pocket-derived remains).
3. **Generator card:** "max width ~28rem" becomes "max width 28rem, 32rem from 640 px, centred
   vertically between header and footer"; the secret item notes 30 px from 640 px; item 6 becomes
   "App pill: a button, 'Pyrgus for iPhone, iPad & Mac — coming soon', that opens the apps dialog."
4. **"Apps section — `#apps`"** is replaced by **"Apps dialog"**, with the content, behaviour and
   mobile notes from this document. The phone-mockup and fixed-sample bullets are removed; the
   widget and badge-guideline bullets stay.
5. **README section 8 and `LICENSE`:** the exclusion lists only `src/components/catalyst/`.
6. **Project structure:** `phone-frame.svg`, `AppsSection.tsx` and `PhoneMockup.tsx` are removed;
   `AppsDialog.tsx` is added; the Catalyst list gains `dialog`.

The same commit updates `LICENSE` and the README's licence line to match item 5.
