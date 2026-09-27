# Apps Dialog, Centered Generator and Docs Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the "coming soon" apps section into a dialog, make the generator slightly bigger and vertically centred, and write the spec/plan conventions and the ask-before-fetching rule into `AGENTS.md` and `README.md`.

**Architecture:** A new `AppsDialog` component owns the pill button and a Catalyst `Dialog` (Headless UI underneath), rendered by `App` below `GeneratorCard`. `AppsSection`, `PhoneMockup` and the Pocket phone frame are deleted. Layout changes are Tailwind classes only: `<main>` becomes a centring flex column, and the generator widens and enlarges its secret from the `sm` breakpoint. No change to generation, clipboard, state or headers.

**Tech Stack:** Vite 8, React 19 + React Compiler, TypeScript 6, Tailwind CSS v4, Headless UI 2 via Catalyst, Vitest 5 + jsdom + Testing Library + user-event, Playwright (Chromium, production headers via `vite preview`).

**Spec:** `docs/2026-09-26-apps-dialog-spec.md` (the change spec) and `docs/2026-09-26-pyrgus-web-spec.md` (the binding spec it amends). Read both before starting a task. When this plan and the change spec disagree, the spec wins; stop and report the conflict.

## Global Constraints

- **Node 24.** The default `node` on this machine is 25, which the test tooling rejects. Prefix every `npm`/`npx` command with `source ~/.nvm/nvm.sh && nvm use 24 >/dev/null && `. In this plan, `$ n24 <cmd>` means exactly that prefix followed by `<cmd>`; in a chain (`$ n24 a && b`) the prefix is written once and applies to every command after it.
- **No downloads or installs.** Do not run `npm install`, `npm update`, `npm uninstall`, `npx playwright install`, or fetch anything from the network. `npm ci` and already-installed tools are allowed. If something is missing, stop and ask the user.
- **No new dependencies.** Runtime dependencies stay exactly `react`, `react-dom`, `@headlessui/react`, `clsx`.
- **Never loosen `vercel.json` or the CSP.** CSP (exact): `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; manifest-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'`. If the dialog trips it, fix the code.
- **No `dangerouslySetInnerHTML`, inline scripts, `style="…"` in HTML, or `data:` URIs.**
- **Tailwind Plus.** Copy `dialog.tsx` with `cp` from `tmp/catalyst-ui-kit/typescript/`; do not edit its logic, and never paste Tailwind Plus source into docs or commit messages. `src/components/catalyst/` is excluded from Prettier and has a lint override; nothing else about it changes.
- **React Compiler is on:** no manual `useMemo` / `useCallback`.
- **Tests** are colocated `*.test.ts(x)`, import from `vitest` explicitly, and component tests start with `// @vitest-environment jsdom`. Playwright specs live in `e2e/`.
- **Prettier:** no semicolons, single quotes, 120 columns. Run `$ n24 npx prettier --write <files>` on files you touch outside `src/components/catalyst/` and `docs/`.
- **Binding spec edits land in the same commit as the code they describe** (`AGENTS.md`).
- **Done for every task:** `$ n24 npm run lint`, `$ n24 npm run build`, `$ n24 npm test` and `$ n24 npm run test:e2e` all pass. Before this plan: 153 unit/component tests, 4 e2e tests.
- **Commits** end with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (or the implementing model's own trailer).

## Review Focus

1. **Phone-sized dialog (320 × 640).** A person on a small phone must be able to reach **Close** without the page behind scrolling. Pinned by the e2e test in Task 2, Step 6.
2. **Opening the dialog must not touch the generator.** A person who generated or copied a password, then reads about the apps, expects the same password when they close it. Pinned by the App test in Task 2, Step 1 ("closes with the Close button and leaves the password alone").
3. **Keyboard-only use.** Tab to the pill, press Enter, and focus must land inside the dialog; Escape returns it to the pill. Pinned by the App tests in Task 2, Step 1.
4. **A long secret at the new size.** Secret 256 at 30 px in a 640 px viewport must wrap without horizontal overflow. Pinned by `e2e/layout.spec.ts` in Task 3, Step 1.
5. **Short viewports.** When the window is shorter than the content (a laptop with a docked keyboard, a landscape phone), centring must not push the card under the header or over the footer. The page scrolls instead. Pinned by `e2e/layout.spec.ts` in Task 3, Step 1.

## File Map

| File | Change | Task |
|---|---|---|
| `AGENTS.md` | Add "Specs and plans" and "Downloads and installs"; reword `tmp/` and "What this is" | 1 |
| `README.md` | Add "Specs and plans" subsection under Development | 1 |
| `docs/2026-09-26-pyrgus-web-spec.md` | Repository documentation edits (change spec items 7–9) | 1 |
| `src/components/catalyst/dialog.tsx` | Create (copied from Catalyst) | 2 |
| `src/components/AppsDialog.tsx` | Create: pill + dialog | 2 |
| `src/components/GeneratorCard.tsx` | Remove the pill link | 2 |
| `src/App.tsx` | Render `AppsDialog` instead of `AppsSection` | 2 |
| `src/App.test.tsx` | Replace apps-section/phone tests with dialog tests | 2 |
| `e2e/smoke.spec.ts` | Add dialog CSP test and 320 × 640 fit test | 2 |
| `src/components/AppsSection.tsx`, `src/components/PhoneMockup.tsx`, `src/assets/phone-frame.svg` | Delete | 2 |
| `LICENSE`, `README.md` | Exclusion lists only `src/components/catalyst/` | 2 |
| `docs/2026-09-26-pyrgus-web-spec.md` | Change spec items 1, 2, 3 (pill), 4, 5, 6, 10 | 2 |
| `src/App.tsx`, `src/components/GeneratorCard.tsx`, `src/components/SecretDisplay.tsx` | Centring and sizes | 3 |
| `e2e/layout.spec.ts` | Create: centring, size, 640 px wrap, short viewport | 3 |
| `docs/2026-09-26-pyrgus-web-spec.md` | Change spec item 3 (sizes and centring), Playwright section | 3 |
| `docs/2026-09-26-apps-dialog-spec.md` | Status → Implemented | 3 |

---

### Task 1: Spec/plan conventions and the ask-before-fetching rule

Documentation only; no product code. It lands first so Tasks 2–3 already run under the new rules.

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md` (Development section)
- Modify: `docs/2026-09-26-pyrgus-web-spec.md` (section "Repository documentation")

**Interfaces:**
- Consumes: nothing.
- Produces: nothing code-level. Later tasks follow the new "Downloads and installs" rule.

- [ ] **Step 1: Update "What this is" in `AGENTS.md`**

Replace:

```markdown
requests. The spec at `docs/2026-09-26-pyrgus-web-spec.md` is the source of truth. A change to the
design updates the spec in the same commit.
```

with:

```markdown
requests. The spec at `docs/2026-09-26-pyrgus-web-spec.md` is the source of truth. A change to the
design updates the spec in the same commit; larger changes come as dated change specs that amend it
(see "Specs and plans").
```

- [ ] **Step 2: Reword the `tmp/` layout line in `AGENTS.md`**

Replace:

```markdown
- `tmp/` — gitignored Tailwind Plus downloads; never commit
```

with:

```markdown
- `tmp/` — gitignored downloads, placed there by the user; never commit
```

- [ ] **Step 3: Add the "Specs and plans" section to `AGENTS.md`**

Insert this section directly after the "Layout" section (before "## Security rules (non-negotiable)"):

````markdown
## Specs and plans

Everything lives flat in `docs/`. Never use a tool's default location (such as
`docs/superpowers/specs/`).

| File | Purpose |
|---|---|
| `docs/YYYY-MM-DD-<topic>-spec.md` | Design: what and why. Approved by the user before any plan. |
| `docs/YYYY-MM-DD-<topic>-plan.md` | Implementation plan: how, step by step. Written only after the spec is approved. |
| `docs/YYYY-MM-DD-<topic>-task-overview.md` | Optional one-table summary of a long plan. |

`YYYY-MM-DD` is the date the spec was written; the plan and overview reuse the spec's date and
`<topic>`. `<topic>` is short kebab-case (`apps-dialog`).

**The binding spec**, `docs/2026-09-26-pyrgus-web-spec.md`, always describes the site as built. Edit
it only in the same commit as the code it describes.

**A change spec** (any later `-spec.md`):

- starts with `**Date:**`, `**Status:**` (`Draft` → `Approved YYYY-MM-DD` → `Implemented YYYY-MM-DD`),
  `**Amends:**` (the binding spec) and, once one exists, `**Plan:**`;
- has these sections, in order: Summary; Intent (what the user asked for, kept apart from
  assumptions); Non-goals; the design, per file or component; Security; Testing; Binding spec
  changes;
- ends with **Binding spec changes**: a numbered list of the exact edits to the binding spec (and to
  `LICENSE` / `README.md` where affected), applied in the implementation commits;
- is not edited after its status becomes `Implemented`. The binding spec carries the current truth.

**A plan** (`-plan.md`):

- starts with the writing-plans header (goal, architecture, tech stack), a `**Spec:**` line, and the
  rule "when the plan and the spec disagree, the spec wins; stop and report";
- repeats the Global Constraints that bind the work, copied from this file and the spec;
- is split into numbered tasks. Each task lists the files it creates, modifies or deletes; uses
  checkbox steps (`- [ ]`); writes the failing test before the code; gives exact commands and their
  expected result; and ends with `lint`, `build`, `test` and `test:e2e` passing and a commit with
  its message.

Neither ever pastes Tailwind Plus source; a plan says which file to `cp` from `tmp/`.

**Order:** spec written → user approves the spec → plan written → user reviews the plan and picks how
to execute it → code. No product code before both are approved.
````

- [ ] **Step 4: Add the "Downloads and installs" section to `AGENTS.md`**

Insert this section directly after the "Dependencies" section (before "## Tailwind Plus"):

```markdown
## Downloads and installs

Agents never fetch from the network or change installed packages themselves. That covers
downloading files (Tailwind Plus kits, fonts, wordlists, anything into `tmp/`), `npm install`,
`npm update`, `npm uninstall`, `npx <package>` for anything not already installed, and
`npx playwright install`.

Instead, stop and ask the user, giving:

1. the exact URL or command (npm commands with `-E`, exact versions);
2. the destination path (`tmp/<name>` for files);
3. how the result will be verified: SHA-256, version number, or the `package.json` / lockfile diff.

Wait, then verify before using the result. If it does not verify, say so and do not use it.

Allowed without asking: `npm ci` (installs exactly what the committed lockfile says) and running
tools that are already installed.
```

- [ ] **Step 5: Add the "Specs and plans" subsection to `README.md`**

Replace the last paragraph of the Development section:

```markdown
Rules for contributors and coding agents are in [`AGENTS.md`](AGENTS.md); the design is in
[`docs/2026-09-26-pyrgus-web-spec.md`](docs/2026-09-26-pyrgus-web-spec.md).
```

with:

```markdown
Rules for contributors and coding agents are in [`AGENTS.md`](AGENTS.md).

### Specs and plans

The design lives in [`docs/`](docs/). [`docs/2026-09-26-pyrgus-web-spec.md`](docs/2026-09-26-pyrgus-web-spec.md)
is the binding spec: it always describes the site as built. Each later change gets a dated pair,
`docs/YYYY-MM-DD-<topic>-spec.md` and `docs/YYYY-MM-DD-<topic>-plan.md`. The spec is approved before
the plan is written, and the binding spec is updated in the same commit as the code. The full rules
are in [`AGENTS.md`](AGENTS.md).
```

- [ ] **Step 6: Apply change spec items 7–9 to the binding spec**

In `docs/2026-09-26-pyrgus-web-spec.md`, section "Repository documentation":

(a) In the `AGENTS.md` contents list, item 1, replace:

```markdown
   at `docs/2026-09-26-pyrgus-web-spec.md` is the source of truth, and design changes update the spec
   in the same change.
```

with:

```markdown
   at `docs/2026-09-26-pyrgus-web-spec.md` is the source of truth, and design changes update the spec
   in the same change; larger changes come as dated change specs that amend it.
```

(b) After item 9 (`**Scope**`), append:

```markdown
10. **Specs and plans** — everything flat in `docs/`: `YYYY-MM-DD-<topic>-spec.md`, `-plan.md` and an
    optional `-task-overview.md`. This spec always describes the site as built; change specs carry a
    Date/Status/Amends/Plan header, fixed sections, and end with "Binding spec changes"; plans link
    their spec, repeat the global constraints, and use test-first checkbox tasks. Spec approved →
    plan → user picks execution → code.
11. **Downloads and installs** — agents never download files or install, update or uninstall
    packages. They ask the user with the exact URL or command, the destination (`tmp/<name>`), and
    how the result will be verified, then verify before use. `npm ci` and installed tools are allowed.
```

(c) Under `### CLAUDE.md`, replace:

```markdown
A single line: `@AGENTS.md`.
```

with:

```markdown
A single line: `@AGENTS.md`. It deliberately holds no rules of its own, so the two cannot drift.
```

(d) In the `README.md` contents list, item 4, replace:

```markdown
4. **Development** — prerequisites (Node 24 LTS, from `.nvmrc`), `npm ci`, the scripts, and
   the note that the CSP is enforced in `preview`, not `dev`.
```

with:

```markdown
4. **Development** — prerequisites (Node 24 LTS, from `.nvmrc`), `npm ci`, the scripts, the note
   that the CSP is enforced in `preview`, not `dev`, and a "Specs and plans" paragraph: the naming
   scheme, the binding spec, and a pointer to `AGENTS.md`.
```

- [ ] **Step 7: Format and verify**

Run: `$ n24 npx prettier --check AGENTS.md README.md`
Expected: `All matched files use Prettier code style!` If not, run `$ n24 npx prettier --write AGENTS.md README.md` and re-check.

Run: `$ n24 npm run lint && npm run build && npm test && npm run test:e2e`
Expected: all pass; 153 unit/component tests, 4 e2e tests (no code changed).

- [ ] **Step 8: Commit**

```bash
git add AGENTS.md README.md docs/2026-09-26-pyrgus-web-spec.md
git commit -m "docs: define how specs and plans are written; agents ask before downloading or installing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The apps dialog

**Files:**
- Create: `src/components/catalyst/dialog.tsx` (copied)
- Create: `src/components/AppsDialog.tsx`
- Modify: `src/components/GeneratorCard.tsx` (remove the pill `<div className="mt-6 text-center">…</div>`)
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `e2e/smoke.spec.ts`
- Delete: `src/components/AppsSection.tsx`, `src/components/PhoneMockup.tsx`, `src/assets/phone-frame.svg`
- Modify: `LICENSE`, `README.md` (licence line), `docs/2026-09-26-pyrgus-web-spec.md`

**Interfaces:**
- Consumes: `Badge` (`./catalyst/badge`, `color="indigo"`), `Button` (`./catalyst/button`, `plain` prop), `WidgetMockup({ className?: string })` (`./WidgetMockup`), and from the copied `./catalyst/dialog`: `Dialog({ open, onClose, size?, className?, children })`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogActions`.
- Produces: `export function AppsDialog(): JSX.Element`, with no props. It renders the pill (`<button>` named "Pyrgus for iPhone, iPad & Mac — coming soon") and the dialog (accessible name "Pyrgus is coming to iPhone, iPad & Mac"). Task 3 relies on it rendering the pill wrapper `div` as its **only in-flow element**: a closed Headless UI dialog renders nothing, and an open one renders in a portal.

- [ ] **Step 1: Write the failing App tests**

Replace the whole of `src/App.test.tsx` with:

```tsx
// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { EFF_WORDLIST_URL, REPO_URL } from './config'

const PILL = 'Pyrgus for iPhone, iPad & Mac — coming soon'
const TITLE = 'Pyrgus is coming to iPhone, iPad & Mac'
const FEATURE_TITLES = [
  'On-device',
  'A widget that never shows your secret',
  'The clipboard clears itself',
  'Six formats',
]

const secret = () => screen.getByTestId('secret').textContent

describe('App', () => {
  it('renders the generator, the apps pill and the footer, with no apps content in the page', () => {
    render(<App />)
    expect(screen.getByTestId('secret')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: PILL })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument()
    expect(document.getElementById('apps')).toBeNull()

    expect(screen.getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'EFF long wordlist' })).toHaveAttribute('href', EFF_WORDLIST_URL)
    expect(screen.getByText('Passwords are generated in your browser and never leave it.')).toBeInTheDocument()
  })

  it('opens the apps dialog from the pill and closes it with Escape, returning focus to the pill', async () => {
    const user = userEvent.setup()
    render(<App />)
    const pill = screen.getByRole('button', { name: PILL })

    await user.click(pill)
    const dialog = await screen.findByRole('dialog', { name: TITLE })
    expect(within(dialog).getByText('Coming soon · iPhone · iPad · Mac')).toBeInTheDocument()
    expect(within(dialog).getByText('On-device. No account, no net.')).toBeInTheDocument()
    for (const title of FEATURE_TITLES) expect(within(dialog).getByText(title)).toBeInTheDocument()
    // The widget illustration is decorative and never shows a secret.
    expect(within(dialog).getByText('Copied ✓').closest('[aria-hidden="true"]')).not.toBeNull()
    expect(within(dialog).getByText('••••••-••••••-••••••')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(pill).toHaveFocus())
  })

  it('closes with the Close button and leaves the password alone', async () => {
    const user = userEvent.setup()
    render(<App />)
    const before = secret()

    await user.click(screen.getByRole('button', { name: PILL }))
    const dialog = await screen.findByRole('dialog', { name: TITLE })
    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(secret()).toBe(before)
  })

  it('opens from the keyboard and moves focus into the dialog', async () => {
    const user = userEvent.setup()
    render(<App />)
    const pill = screen.getByRole('button', { name: PILL })

    pill.focus()
    await user.keyboard('{Enter}')
    const dialog = await screen.findByRole('dialog', { name: TITLE })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `$ n24 npx vitest run src/App.test.tsx`
Expected: FAIL. The first test fails on `getByRole('button', { name: PILL })` (the pill is still a link) and the rest fail the same way.

- [ ] **Step 3: Copy the Catalyst dialog**

```bash
cp tmp/catalyst-ui-kit/typescript/dialog.tsx src/components/catalyst/dialog.tsx
```

Do not edit it. It imports only `@headlessui/react`, `clsx`, `react` types and `./text`, all already present. If `tmp/catalyst-ui-kit/typescript/dialog.tsx` is missing, stop and ask the user to put the Catalyst kit back in `tmp/`; do not download it.

- [ ] **Step 4: Create `src/components/AppsDialog.tsx`**

```tsx
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

      <Dialog open={open} onClose={() => setOpen(false)}>
        <Badge color="indigo">Coming soon · iPhone · iPad · Mac</Badge>
        <DialogTitle className="mt-4">Pyrgus is coming to iPhone, iPad &amp; Mac</DialogTitle>
        <DialogDescription>On-device. No account, no net.</DialogDescription>
        <DialogBody>
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
        <DialogActions>
          <Button plain onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 5: Wire it in, remove the pill from the card, delete the old section**

In `src/components/GeneratorCard.tsx`, delete this block (the last child of the `<section>`):

```tsx
      <div className="mt-6 text-center">
        <a
          href="#apps"
          className="inline-flex rounded-full px-4 py-1.5 text-sm/6 font-medium text-indigo-700 ring-1 ring-indigo-600/20 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-400/30 dark:hover:bg-indigo-500/10"
        >
          Pyrgus for iPhone, iPad &amp; Mac — coming soon ↓
        </a>
      </div>
```

Replace `src/App.tsx` with:

```tsx
import { AppsDialog } from './components/AppsDialog'
import { Footer } from './components/Footer'
import { GeneratorCard } from './components/GeneratorCard'
import { Header } from './components/Header'

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1 pt-6 sm:pt-12">
        <GeneratorCard />
        <AppsDialog />
      </main>
      <Footer />
    </div>
  )
}
```

(`<main>`'s classes change in Task 3, not here.)

Delete the unused files:

```bash
git rm src/components/AppsSection.tsx src/components/PhoneMockup.tsx src/assets/phone-frame.svg
```

Run: `grep -rn "PhoneMockup\|phone-frame\|AppsSection\|SAMPLE_SECRET\|#apps" src e2e`
Expected: no output.

- [ ] **Step 6: Add the e2e dialog tests**

Append to `e2e/smoke.spec.ts`:

```ts
const APPS_PILL = 'Pyrgus for iPhone, iPad & Mac — coming soon'
const APPS_TITLE = 'Pyrgus is coming to iPhone, iPad & Mac'

test('opens and closes the apps dialog with zero CSP or Trusted Types violations', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/')
  const pill = page.getByRole('button', { name: APPS_PILL })
  await pill.click()
  const dialog = page.getByRole('dialog', { name: APPS_TITLE })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('The clipboard clears itself')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(pill).toBeFocused()

  expect(await violations(page)).toEqual([])
  expect(errors).toEqual([])
})

test('the apps dialog fits a 320 × 640 phone with Close in view', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/')
  await page.getByRole('button', { name: APPS_PILL }).click()

  const dialog = page.getByRole('dialog', { name: APPS_TITLE })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Close' })).toBeInViewport()
  const docWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(docWidth).toBeLessThanOrEqual(320)
  expect(await violations(page)).toEqual([])
})
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `$ n24 npx vitest run src/App.test.tsx`
Expected: PASS, 4 tests.

Run: `$ n24 npm run test:e2e`
Expected: PASS, 6 tests. If the dialog test reports a CSP or Trusted Types violation, fix the code (never `vercel.json`) and report what Headless UI did. If `Close` is not in the viewport at 320 × 640, report it; do not change the change spec's content list to make it fit.

- [ ] **Step 8: Update `LICENSE` and the README licence line**

In `LICENSE`, replace the exclusion paragraph:

```text
EXCLUSION: Files in src/components/catalyst/ and src/components/PhoneMockup.tsx /
src/assets/phone-frame.svg are derived from Tailwind Plus and are licensed under
the Tailwind Plus licence (https://tailwindcss.com/plus/license), not under the
MIT licence above. They may not be redistributed separately from this project.
```

with:

```text
EXCLUSION: Files in src/components/catalyst/ are derived from Tailwind Plus and
are licensed under the Tailwind Plus licence
(https://tailwindcss.com/plus/license), not under the MIT licence above. They
may not be redistributed separately from this project.
```

In `README.md`, replace:

```markdown
- This project's code is [MIT](LICENSE)-licensed, **except** files derived from Tailwind Plus
  (`src/components/catalyst/`, `src/components/PhoneMockup.tsx`, `src/assets/phone-frame.svg`),
  which are under the [Tailwind Plus licence](https://tailwindcss.com/plus/license). See `LICENSE`.
```

with:

```markdown
- This project's code is [MIT](LICENSE)-licensed, **except** files derived from Tailwind Plus
  (`src/components/catalyst/`), which are under the
  [Tailwind Plus licence](https://tailwindcss.com/plus/license). See `LICENSE`.
```

- [ ] **Step 9: Apply change spec items 1, 2, 3 (pill), 4, 5, 6 and 10 to the binding spec**

In `docs/2026-09-26-pyrgus-web-spec.md`:

(1) **Summary.** Replace:

```markdown
Below the generator, a "coming soon" section introduces the Pyrgus apps for iPhone, iPad and Mac.
It is informational only: no waitlist and no data collection.
```

with:

```markdown
A pill below the generator opens a "coming soon" dialog introducing the Pyrgus apps for iPhone, iPad
and Mac. It is informational only: no waitlist and no data collection.
```

(2) **Stack.** Delete the bullet:

```markdown
- **Tailwind Plus Pocket** as the visual reference for the apps section, and the source of the phone
  frame. Pocket's Next.js structure is not adopted.
```

(3) **Generator card, item 6.** Replace:

```markdown
6. **App pill:** "Pyrgus for iPhone, iPad & Mac — coming soon ↓", an in-page link to `#apps`.
```

with:

```markdown
6. **App pill:** a button, "Pyrgus for iPhone, iPad & Mac — coming soon", that opens the apps dialog.
```

(4) **Apps section.** Replace the whole `### Apps section — \`#apps\`` section (its heading through the "Availability marker" bullet, ending before `### Footer`) with:

```markdown
### Apps dialog

The app pill opens a Catalyst `Dialog` (`src/components/AppsDialog.tsx`). Nothing about the apps is
rendered in the page flow, and there is no `#apps` anchor.

- **Content, top to bottom:** a plain chip "Coming soon · iPhone · iPad · Mac"; the title "Pyrgus is
  coming to iPhone, iPad & Mac" (the dialog's accessible name); the description "On-device. No
  account, no net."; the widget illustration; the four feature points; a **Close** button.
- **Widget illustration.** A Home Screen widget mockup showing `••••••-••••••-••••••  Copied`, to
  convey that the widget copies without displaying the secret. It is `aria-hidden` and shows no
  generated value.
- **Four feature points:** on-device with no account and no network; a widget that never shows your
  secret; the clipboard clears itself after 90 seconds; six formats including 128- and 256-bit hex
  secrets.
- **Apple's App Store badges are not used** until the apps are live, per Apple's badge guidelines.
- **Behaviour** comes from Headless UI: focus moves into the dialog on open, Tab is trapped, Escape
  and a backdrop click close it, focus returns to the pill, and the page behind is inert and
  scroll-locked. Below 640 px it is a bottom sheet; if it does not fit, the dialog scrolls, never the
  page behind it.
```

(5) **README contents, item 8.** Replace:

```markdown
8. **Credits and licences** — this repo's own code is MIT; Tailwind Plus-derived files
   (`src/components/catalyst/`, the Pocket-derived phone frame) are under the Tailwind Plus licence
```

with:

```markdown
8. **Credits and licences** — this repo's own code is MIT; Tailwind Plus-derived files
   (`src/components/catalyst/`) are under the Tailwind Plus licence
```

**`LICENSE` subsection.** Replace:

```markdown
> Files in `src/components/catalyst/` and `src/components/PhoneMockup.tsx` /
> `src/assets/phone-frame.svg` are derived from Tailwind Plus and are licensed under the Tailwind Plus
> licence (https://tailwindcss.com/plus/license), not under the MIT licence above. They may not be
> redistributed separately from this project.
```

with:

```markdown
> Files in `src/components/catalyst/` are derived from Tailwind Plus and are licensed under the
> Tailwind Plus licence (https://tailwindcss.com/plus/license), not under the MIT licence above. They
> may not be redistributed separately from this project.
```

(6) **Project structure.** Delete the line `│   │   └── phone-frame.svg  from Pocket` and change the line above it from `│   │   ├── fonts/           Inter + JetBrains Mono woff2` to `│   │   └── fonts/           Inter + JetBrains Mono woff2`. Change `catalyst/        button, dropdown, link, text, badge (TypeScript variant)` to `catalyst/        button, dialog, dropdown, link, text, badge (TypeScript variant)`. Delete the `AppsSection.tsx` and `PhoneMockup.tsx` lines and insert `│   │   ├── AppsDialog.tsx` in their place.

(10) **Testing.** In "Component tests", append the bullet:

```markdown
- The apps pill opens a dialog named "Pyrgus is coming to iPhone, iPad & Mac"; Escape and Close
  close it, focus returns to the pill, and the password is unchanged.
```

In "Playwright smoke test", after the 320 px bullet, append:

```markdown
- The apps dialog opens and closes with zero CSP or Trusted Types violations, and at 320 × 640 its
  Close button is in view with no horizontal overflow.
```

Then check nothing stale remains:

Run: `grep -n "PhoneMockup\|phone-frame\|Pocket-derived\|#apps\|AppsSection" docs/2026-09-26-pyrgus-web-spec.md LICENSE README.md`
Expected: no output. (Mentions of Pocket in `AGENTS.md`'s Tailwind Plus section and in the binding spec's supply-chain licensing note refer to the download in `tmp/` and stay.)

- [ ] **Step 10: Format, full check**

Run: `$ n24 npx prettier --write src/App.tsx src/App.test.tsx src/components/AppsDialog.tsx src/components/GeneratorCard.tsx e2e/smoke.spec.ts README.md`
Run: `$ n24 npm run lint && npm run build && npm test && npm run test:e2e`
Expected: all pass; 155 unit/component tests (153 − 2 old App tests + 4 new), 6 e2e tests. Lint reports nothing for `src/components/catalyst/dialog.tsx`. If it does, add only a rule override to the existing catalyst block in `eslint.config.js`, never edit the copied file's logic, and report it.

- [ ] **Step 11: Commit**

```bash
git add -A src e2e LICENSE README.md docs/2026-09-26-pyrgus-web-spec.md
git commit -m "feat: show the coming-soon apps content in a dialog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Bigger, vertically centred generator

**Files:**
- Create: `e2e/layout.spec.ts`
- Modify: `src/App.tsx` (`<main>` classes)
- Modify: `src/components/GeneratorCard.tsx` (section and card classes)
- Modify: `src/components/SecretDisplay.tsx` (secret classes)
- Modify: `docs/2026-09-26-pyrgus-web-spec.md` (Generator card, Playwright section)
- Modify: `docs/2026-09-26-apps-dialog-spec.md` (Status)

**Interfaces:**
- Consumes: from Task 2, `<main>` contains exactly `GeneratorCard`'s `<section aria-labelledby="generator-heading">` followed by `AppsDialog`'s pill wrapper `div` as its in-flow children.
- Produces: nothing new for other code.

- [ ] **Step 1: Write the failing layout tests**

Create `e2e/layout.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'

/** Gaps between the header and the main content, and between the main content and the footer. */
async function gaps(page: Page) {
  return page.evaluate(() => {
    const header = document.querySelector('header')!.getBoundingClientRect()
    const footer = document.querySelector('footer')!.getBoundingClientRect()
    const main = document.querySelector('main')!
    const first = main.firstElementChild!.getBoundingClientRect()
    const last = main.lastElementChild!.getBoundingClientRect()
    return { above: first.top - header.bottom, below: footer.top - last.bottom }
  })
}

const generator = (page: Page) => page.locator('section[aria-labelledby="generator-heading"]')

async function chooseFormat(page: Page, label: string) {
  await page.getByRole('button', { name: /^Format:/ }).click()
  await page.getByRole('menuitem', { name: label }).click()
}

test('the generator is vertically centred between header and footer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  await expect(page.getByTestId('secret')).not.toBeEmpty()
  const { above, below } = await gaps(page)
  expect(above).toBeGreaterThan(40)
  expect(Math.abs(above - below)).toBeLessThanOrEqual(1)
})

test('the generator is 32rem wide with a 30 px secret from 640 px, and unchanged on phones', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  expect((await generator(page).boundingBox())?.width).toBe(512)
  expect(await page.getByTestId('secret').evaluate((el) => getComputedStyle(el).fontSize)).toBe('30px')

  await page.setViewportSize({ width: 320, height: 800 })
  expect((await generator(page).boundingBox())?.width).toBe(320)
  expect(await page.getByTestId('secret').evaluate((el) => getComputedStyle(el).fontSize)).toBe('24px')
})

test('Secret 256 at 30 px wraps without overflow at 640 px', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 })
  await page.goto('/')
  await chooseFormat(page, 'Secret 256')
  const secret = page.getByTestId('secret')
  await expect(secret).toHaveText(/^[0-9a-f]{64}$/)
  const m = await secret.evaluate((el) => ({
    fontSize: getComputedStyle(el).fontSize,
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    docWidth: document.documentElement.scrollWidth,
  }))
  expect(m.fontSize).toBe('30px')
  expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth)
  expect(m.docWidth).toBeLessThanOrEqual(640)
})

test('on a short viewport the content never overlaps the header or footer; the page scrolls', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 })
  await page.goto('/')
  await expect(page.getByTestId('secret')).not.toBeEmpty()
  const { above, below } = await gaps(page)
  expect(above).toBeGreaterThanOrEqual(0)
  expect(below).toBeGreaterThanOrEqual(0)
  const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)
  expect(scrollable).toBe(true)
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `$ n24 npx playwright test e2e/layout.spec.ts`
Expected: FAIL for the first three tests. The centring test fails because `above` is much smaller than `below`. The width test fails with 448 not 512. The 640 px test fails with fontSize `24px`. The short-viewport test may already pass. It guards against a regression, so it is not expected to fail first.

- [ ] **Step 3: Centre `<main>`**

In `src/App.tsx`, replace:

```tsx
      <main className="flex-1 pt-6 sm:pt-12">
```

with:

```tsx
      <main className="flex flex-1 flex-col justify-center py-8">
```

`<main>` is a flex item of a `min-h-full` column, so its minimum height is its content. On a short viewport it grows and the page scrolls, and it never overflows upward.

- [ ] **Step 4: Widen the column and the card padding**

In `src/components/GeneratorCard.tsx`, replace:

```tsx
    <section aria-labelledby="generator-heading" className="mx-auto w-full max-w-md px-4">
```

with:

```tsx
    <section aria-labelledby="generator-heading" className="mx-auto w-full max-w-md px-4 sm:max-w-lg">
```

and replace:

```tsx
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
```

with:

```tsx
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 sm:p-8 dark:bg-zinc-900 dark:ring-white/10">
```

- [ ] **Step 5: Enlarge the secret from 640 px**

In `src/components/SecretDisplay.tsx`, replace:

```tsx
        className="cursor-pointer font-mono text-2xl/9 font-medium tracking-wide wrap-anywhere text-zinc-950 select-all dark:text-white"
```

with:

```tsx
        className="cursor-pointer font-mono text-2xl/9 font-medium tracking-wide wrap-anywhere text-zinc-950 select-all sm:text-3xl/10 dark:text-white"
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `$ n24 npx prettier --write src/App.tsx src/components/GeneratorCard.tsx src/components/SecretDisplay.tsx e2e/layout.spec.ts`
Run: `$ n24 npx playwright test e2e/layout.spec.ts`
Expected: PASS, 4 tests. (Prettier's Tailwind plugin may reorder the classes; that is fine.)

- [ ] **Step 7: Apply change spec item 3 (sizes and centring) to the binding spec**

In `docs/2026-09-26-pyrgus-web-spec.md`, section "Generator card", replace:

```markdown
A centered column, max width ~28rem, working down to a 320 px viewport. Top to bottom:
```

with:

```markdown
A column 28rem wide at most (32rem from 640 px), working down to a 320 px viewport, with 1.5rem
card padding (2rem from 640 px). It is centred vertically in the space between header and footer;
when the viewport is shorter than the content, the page scrolls. Top to bottom:
```

and in item 3, replace:

```markdown
3. **The secret.** Large monospaced text, digits highlighted in indigo (all formats, including hex).
```

with:

```markdown
3. **The secret.** Large monospaced text (24 px; 30 px from 640 px), digits highlighted in indigo
   (all formats, including hex).
```

In "Playwright smoke test", append:

```markdown
- **Layout** (`e2e/layout.spec.ts`): the generator is vertically centred between header and footer
  at 1280 × 900; it is 32rem wide with a 30 px secret from 640 px and unchanged at 320 px; Secret 256
  wraps without overflow at 640 px; at 1280 × 400 the content never overlaps the header or footer and
  the page scrolls.
```

- [ ] **Step 7b: Mark the change spec implemented**

In `docs/2026-09-26-apps-dialog-spec.md`, replace the `**Status:**` line with:

```markdown
**Status:** Implemented 2026-09-26.
```

- [ ] **Step 8: Full check and visual check**

Run: `$ n24 npm run lint && npm run build && npm test && npm run test:e2e`
Expected: all pass; 155 unit/component tests, 10 e2e tests.

Visual check. Run `$ n24 npm run build && npm run preview`, then open `http://localhost:4173`. Check light and dark themes at 320, 768 and 1280 px wide:
- the generator sits centred between header and footer;
- the secret is visibly larger at 768 and 1280, and unchanged at 320;
- the pill opens the dialog, and the dialog is not clipped; at 320 px it is a bottom sheet;
- the widget mockup is centred and readable in both themes.

Report what you saw, including anything that looks off. Do not tune the design beyond this plan without asking.

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx src/components/GeneratorCard.tsx src/components/SecretDisplay.tsx e2e/layout.spec.ts docs/2026-09-26-pyrgus-web-spec.md docs/2026-09-26-apps-dialog-spec.md
git commit -m "feat: centre the generator vertically and enlarge it from 640 px

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
