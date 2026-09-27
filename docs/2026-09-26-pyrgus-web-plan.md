# Pyrgus Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Pyrgus Web — a static, browser-only password and secret-key generator at `p.mss.io`, with a "coming soon" section for the Pyrgus native apps.

**Architecture:** A framework-free TypeScript core (`src/core/`) generates secrets from `crypto.getRandomValues` with rejection sampling; a single React hook (`usePyrgus`) owns UI state; presentational components built from Tailwind Plus Catalyst render it. The site is a plain Vite SPA served by Vercel with a strict CSP that forbids all network access, inline code and `data:` URIs.

**Tech Stack:** Vite 8 (Rolldown), React 19 + React Compiler, TypeScript 6 (`erasableSyntaxOnly`), Tailwind CSS v4 (`@tailwindcss/vite`), Headless UI 2, clsx, Vitest 5 + jsdom 30 + Testing Library, Playwright, ESLint 10 (flat config), Prettier + `prettier-plugin-tailwindcss`, Vercel, GitHub Actions.

**Spec:** `docs/2026-09-26-pyrgus-web-spec.md` — read it before starting any task. When this plan and the spec disagree, the spec wins; stop and report the conflict.

## Global Constraints

- Runtime dependencies are exactly `react`, `react-dom`, `@headlessui/react`, `clsx`. Nothing else, ever, without asking.
- Every version in `package.json` is exact (no `^`, no `~`). `.npmrc` contains `save-exact=true`.
- Node 24 LTS (`.nvmrc` = `24`, `engines.node` = `24.x`). Activate the installed Node 24 before running commands and verify `node --version` reports `v24.*`; writing `.nvmrc` alone does not switch the current shell.
- Held majors (do not upgrade): `typescript` stays 6.x (`typescript-eslint` supports `<6.1.0`), `@babel/core` stays 7.x (`babel-plugin-react-compiler` is built on Babel 7), `@types/node` stays 24.x (matches the Node 24 runtime).
- All randomness goes through `src/core/random.ts`. `Math.random` is forbidden everywhere (ESLint `no-restricted-properties`). Never reduce with `x % n` without rejection sampling.
- No network access from the page: no `fetch`, no XHR, no third-party scripts, fonts, analytics or CDNs.
- No `dangerouslySetInnerHTML`, no inline `<script>`, no `style="…"` attributes in HTML, no `data:` URIs. `build.assetsInlineLimit: 0`, `build.modulePreload.polyfill: false`.
- CSP (exact): `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; manifest-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'`. Never loosen it to make code work.
- A generated secret is never persisted, logged or passed to `console.*`. Only `pyrgus.format` and `pyrgus.pinLength` go to `localStorage`.
- Fail closed: if secure randomness is unavailable, show the error state; never a fallback value.
- `src/core/` imports nothing from React and no DOM API except `crypto`.
- TypeScript `erasableSyntaxOnly`: no `enum`, `namespace`, or constructor parameter properties. Use string-literal unions and `#private` fields.
- React Compiler is on: no manual `useMemo` / `useCallback`.
- Tests are colocated `src/**/*.test.ts(x)` and import `describe`/`it`/`expect`/`vi` from `vitest` explicitly. Component tests start with `// @vitest-environment jsdom`. Playwright specs are `e2e/*.spec.ts`.
- Test-only code (seeded RNG, chi-squared helpers, Vitest setup) lives in `test-support/`, never in `src/`.
- Tailwind Plus: the downloads stay in gitignored `tmp/` and are never committed. **Never paste Tailwind Plus source into this plan, docs, or commit messages**; copy files with `cp` from `tmp/` and edit them in place. Every Tailwind Plus-derived file outside `src/components/catalyst/` is listed in `LICENSE`'s exclusion notice.
- Copy (exact strings):
  - Title: `Pyrgus: Password Generator`
  - Description: `Strong passwords and secret keys, generated in your browser. No account, no network.`
  - Error: `Your browser can't provide secure randomness, so Pyrgus won't generate a password.`
  - Clipboard caption: `Clipboard clears in 90s while this tab is open.`
  - Copy failure: `Couldn't copy. Select the password and copy it manually.`
  - Pill: `Pyrgus for iPhone, iPad & Mac — coming soon ↓`
  - Apps heading: `Pyrgus is coming to iPhone, iPad & Mac`; subheading: `On-device. No account, no net.`
  - Chip: `Coming soon · iPhone · iPad · Mac`
  - Noscript: `Pyrgus needs JavaScript to generate passwords in your browser. Nothing is ever sent anywhere.`
- Formatting: Prettier with `semi: false`, `singleQuote: true`, `printWidth: 120` (matches the generated files and Catalyst).
- Work only inside this repository. Do not edit the native app repo; flag needed native changes instead.
- Before claiming any task done: `npm run lint`, `npm run build`, `npm test` pass (and `npm run test:e2e` from Task 10 onward).

## Review Focus

Inputs and conditions the spec implies but that are easy to miss. Each has a test in the task named in brackets.

1. **Clipboard write is refused** (permission denied, unsupported browser, insecure context) → the user sees "Couldn't copy…", never a false "Copied ✓", and no clear timer is armed. [Task 6 clipboard test; Task 8 GeneratorCard test]
2. **`localStorage` throws or holds junk** (Safari private mode, blocked site data, a value from an older/newer build) → the page works with defaults (`standard`, `6`) and never crashes. [Task 6 preferences test]
3. **Longest secret on the narrowest screen** (Secret 256 at 320 px) → wraps onto several lines, no horizontal scroll, nothing truncated. [Task 10 Playwright test]
4. **Rapid successive actions and delayed clipboard promises** (copy, copy again, or copy then regenerate/change format/change PIN length) → a newer copy invalidates old timers and in-flight clears; stale copy successes or failures never update the current password’s feedback. Recheck focus after a delayed read. [Task 6 deferred-read/write tests; Task 7 deferred-copy tests]
5. **The user copies something else, or leaves the tab, within 90 s** → Pyrgus never clears the clipboard content it did not write, and never clears while unfocused. [Task 6 clipboard test]

---

## File map

| File | Responsibility | Task |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `.nvmrc`, `.npmrc`, `.prettierrc.json`, `.prettierignore` | Repo rules, licence, toolchain pins | 1 |
| `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`, `package.json` | Build, lint, type-check, scripts | 1, 10 |
| `test-support/seeded-random.ts` | Deterministic `RandomSource` implementations for tests | 1 |
| `test-support/chi-squared.ts` | Uniformity assertions | 1 |
| `test-support/setup.ts` | jest-dom matchers, RTL cleanup, jsdom shims | 1 |
| `src/core/random.ts` | CSPRNG access, unbiased `randomInt`, `shuffle`, `randomBytes` | 2 |
| `src/core/charsets.ts` | Alphabets | 3 |
| `src/core/formats.ts` | Format ids, labels, groups, specs (data), type guards | 3 |
| `src/core/wordlist.ts` | EFF long wordlist (generated) | 3 |
| `src/core/test-vectors.json` | Cross-platform vectors | 3 |
| `src/core/generate.ts` | `generate()` | 4 |
| `src/core/entropy.ts` | `entropyBits()`, `formatEntropy()` | 5 |
| `src/lib/clipboard.ts` | Copy + conditional 90 s clear | 6 |
| `src/lib/preferences.ts` | Validated preference storage | 6 |
| `src/lib/spell.ts` | Spoken form of a secret | 6 |
| `src/hooks/usePyrgus.ts` | All UI state | 7 |
| `src/components/catalyst/*` | Copied Catalyst components | 8 |
| `src/components/{icons,SecretDisplay,FormatPicker,PinLengthControl,GeneratorCard}.tsx` | Generator UI | 8 |
| `src/assets/fonts/*` | Inter + JetBrains Mono woff2 + OFL licences | 8 |
| `src/config.ts` | Outbound URLs | 9 |
| `src/components/{Logo,Header,Footer,PhoneMockup,WidgetMockup,AppsSection}.tsx` | Page shell and apps section | 9 |
| `index.html`, `public/*`, `design/*` | Metadata, icons, OG image, 404 | 9 |
| `vercel.json`, `src/security-headers.test.ts` | Headers, redirect, their guard test | 10 |
| `playwright.config.ts`, `tsconfig.e2e.json`, `e2e/*.spec.ts` | Real-browser checks | 10 |
| `.github/workflows/ci.yml`, `.github/dependabot.yml` | CI | 11 |
| `README.md` | Human-facing overview | 12 |

---

### Task 1: Project foundation — rules, licence, toolchain, test harness

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md`, `LICENSE`, `.nvmrc`, `.prettierrc.json`, `.prettierignore`, `test-support/seeded-random.ts`, `test-support/chi-squared.ts`, `test-support/chi-squared.test.ts`, `test-support/setup.ts`
- Modify: `package.json`, `vite.config.ts`, `eslint.config.js`, `tsconfig.app.json`, `.gitignore`, `src/App.tsx`, `src/index.css`
- Delete: `src/App.css`, `src/assets/hero.png`, `src/assets/react.svg`, `src/assets/vite.svg`, `public/icons.svg`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `test-support/seeded-random.ts`: `class SeededRandom implements RandomSource { constructor(seed: number); nextUint32(): number }` and `class ScriptedRandom implements RandomSource { constructor(values: readonly number[]); nextUint32(): number; readonly consumed: number }`. Both import the `RandomSource` type from `src/core/random.ts` (created in Task 2; until then they declare a local structural interface — see Step 9).
  - `test-support/chi-squared.ts`: `chiSquared(observed: readonly number[]): number`, `chiSquaredCritical(df: number): number` (p = 0.001), `expectUniform(observed: readonly number[], label?: string): void`, `countBy(n: number, values: Iterable<number>): number[]`.
  - npm scripts: `dev`, `build`, `preview`, `lint`, `format`, `test`, `test:e2e`.

- [ ] **Step 1: Write `AGENTS.md`**

```markdown
# AGENTS.md — rules for coding agents

## What this is

Pyrgus Web: a static, browser-only password and secret-key generator served at https://p.mss.io.
Secrets are generated in the browser with `crypto.getRandomValues`; the page cannot make network
requests. The spec at `docs/2026-09-26-pyrgus-web-spec.md` is the source of truth. A change to the
design updates the spec in the same commit.

## Commands

- `npm ci` — install exactly what the lockfile says
- `npm run dev` — dev server (no CSP; see below)
- `npm run build` — type-check (`tsc -b`) and build to `dist/`
- `npm run preview` — serve `dist/` **with the production security headers**
- `npm run lint` / `npm run format`
- `npm test` — Vitest (unit + component)
- `npm run test:e2e` — Playwright against `preview`

Before claiming any task done: `lint`, `build` and `test` all pass. From Task 10 onward,
`test:e2e` must also pass; its configuration and specs do not exist before Task 10.

## Layout

- `src/core/` — framework-free generator (randomness, formats, wordlist, entropy)
- `src/lib/` — browser helpers (clipboard, preferences, spoken form)
- `src/hooks/usePyrgus.ts` — all UI state
- `src/components/` — presentational components; `src/components/catalyst/` is copied Tailwind Plus code
- `test-support/` — test-only helpers (seeded RNG, chi-squared, Vitest setup)
- `e2e/` — Playwright specs
- `docs/` — spec and plan
- `tmp/` — gitignored Tailwind Plus downloads; never commit

## Security rules (non-negotiable)

- All randomness goes through `src/core/random.ts`. Never `Math.random` (lint enforces it); never
  `x % n` without rejection sampling. *A biased or predictable password is a silent failure.*
- No network access: no `fetch`, XHR, third-party scripts, fonts, analytics or CDNs. *The promise is
  that the secret never leaves the device.*
- Never loosen `vercel.json` headers or the CSP to make something work; fix the code.
  `src/security-headers.test.ts` guards this.
- No `dangerouslySetInnerHTML`, inline scripts, `style="…"` attributes in HTML, or `data:` URIs.
  *Trusted Types and the CSP block them in production.*
- Never persist, log or `console.*` a generated secret. Only `pyrgus.format` and `pyrgus.pinLength`
  go to `localStorage`.
- Fail closed: on a randomness error show the error state, never a fallback value.

## Dependencies

- Exact versions only (`.npmrc` has `save-exact=true`).
- Held majors: `typescript` 6.x (typescript-eslint needs `<6.1.0`), `@babel/core` 7.x (React Compiler),
  `@types/node` 24.x (matches Node 24). Dependabot ignores their major bumps.
- Runtime dependencies are `react`, `react-dom`, `@headlessui/react`, `clsx`. Ask before adding any
  other runtime dependency.

## Tailwind Plus

- The Catalyst and Pocket downloads live in gitignored `tmp/`. Never commit them, never copy them
  wholesale, never paste their source into docs.
- Copy a single component into `src/components/catalyst/` only when it is used.
- Any Tailwind Plus-derived file outside `src/components/catalyst/` must be listed in `LICENSE`'s
  exclusion notice.

## Code conventions

- `src/core/` imports no React and no DOM API other than `crypto`.
- Formats are data in `src/core/formats.ts`, not branches.
- React Compiler is on: no manual `useMemo` / `useCallback`.
- `erasableSyntaxOnly`: no `enum`, `namespace` or constructor parameter properties.
- Tests are colocated as `*.test.ts(x)` and import from `vitest` explicitly; component tests start
  with `// @vitest-environment jsdom`. Core changes are test-first.
- Prettier: no semicolons, single quotes, 120 columns.

## Cross-platform parity

`src/core/test-vectors.json` mirrors the native Pyrgus app. Changing alphabets, formats, entropy or
the wordlist means updating the vectors **and** telling the user the native repo needs the same
change. Agents do not edit the native repo.

## Scope

Work only inside this repository.
```

- [ ] **Step 2: Write `CLAUDE.md`, `LICENSE`, `.nvmrc`**

`CLAUDE.md`:

```markdown
@AGENTS.md
```

`LICENSE`:

```text
MIT License

Copyright (c) 2026 mss.io

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

EXCLUSION: Files in src/components/catalyst/ and src/components/PhoneMockup.tsx /
src/assets/phone-frame.svg are derived from Tailwind Plus and are licensed under
the Tailwind Plus licence (https://tailwindcss.com/plus/license), not under the
MIT licence above. They may not be redistributed separately from this project.
```

`.nvmrc`:

```text
24
```

`.npmrc` already exists (created by the user) and contains `save-exact=true`; leave it.

- [ ] **Step 3: Remove the Vite boilerplate**

```bash
git rm -q src/App.css src/assets/hero.png src/assets/react.svg src/assets/vite.svg public/icons.svg
```

Replace `src/App.tsx` with a placeholder (replaced in Task 8):

```tsx
export default function App() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Pyrgus</h1>
    </main>
  )
}
```

Replace `src/index.css` with (fonts are added in Task 8):

```css
@import 'tailwindcss';
```

- [ ] **Step 4: Verify the pinned dependencies and set scripts and engines**

The user installed all packages on 2026-09-26, and `package.json` was then rewritten to the exact
installed versions (runtime: `@headlessui/react`, `clsx`, `react`, `react-dom`; everything else in
`devDependencies`). **Do not install, upgrade or downgrade anything.** Verify, then set the scripts
and `engines`:

```bash
grep -cE '"[~^]' package.json   # expect 0
node -e "console.log(Object.keys(require('./package.json').dependencies).join(','))"
# expect: @headlessui/react,clsx,react,react-dom
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs'
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
pkg.engines = { node: '24.x' }
pkg.scripts = {
  dev: 'vite',
  build: 'tsc -b && vite build',
  preview: 'vite preview',
  lint: 'eslint .',
  format: 'prettier --write .',
  test: 'vitest run',
  'test:e2e': 'playwright test',
}
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
EOF
npm install   # syncs the lockfile's root entry only; versions must not change
git diff package.json
```

Expected: `0`, then the four runtime packages; the diff touches only `scripts` and `engines`.

- [ ] **Step 5: Configure Prettier and extend `.gitignore`**

`.prettierrc.json`:

```json
{
  "semi": false,
  "singleQuote": true,
  "printWidth": 120,
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindStylesheet": "./src/index.css"
}
```

`.prettierignore`:

```text
tmp
dist
docs
package-lock.json
src/components/catalyst
playwright-report
test-results
```

Append to `.gitignore`:

```text

# Playwright
playwright-report
test-results
```

- [ ] **Step 6: Replace `vite.config.ts`** (security-header wiring is added in Task 10)

```ts
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  build: {
    // The polyfill can inject inline script, which the CSP blocks; every target browser supports modulepreload.
    modulePreload: { polyfill: false },
    // Never inline assets as data: URIs; img-src/font-src 'self' would block them.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test-support/**/*.test.ts'],
    setupFiles: ['test-support/setup.ts'],
  },
})
```

- [ ] **Step 7: Replace `eslint.config.js`**

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'tmp', 'playwright-report', 'test-results']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Use src/core/random.ts (crypto.getRandomValues). Math.random is not a CSPRNG.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Forbidden: the Trusted Types CSP blocks it in production.',
        },
      ],
    },
  },
])
```

- [ ] **Step 8: Update `tsconfig.app.json`**

In `compilerOptions`, add `"resolveJsonModule": true`. Change `"include": ["src"]` to:

```json
  "include": ["src", "test-support"]
```

- [ ] **Step 9: Write the test-support helpers**

`test-support/seeded-random.ts`:

```ts
// Test-only RandomSource implementations. Never import from src/ production code.

/** Structural copy of src/core/random.ts's RandomSource, so this file has no dependency on it. */
interface RandomSource {
  nextUint32(): number
}

/** Deterministic 32-bit generator (mulberry32). Statistically fine for tests; NOT secure. */
export class SeededRandom implements RandomSource {
  #state: number

  constructor(seed: number) {
    this.#state = seed >>> 0
  }

  nextUint32(): number {
    this.#state = (this.#state + 0x6d2b79f5) >>> 0
    let t = this.#state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return (t ^ (t >>> 14)) >>> 0
  }
}

/** Returns the given values in order, then throws. Lets a test control every draw exactly. */
export class ScriptedRandom implements RandomSource {
  #values: readonly number[]
  #index = 0

  constructor(values: readonly number[]) {
    this.#values = values
  }

  nextUint32(): number {
    if (this.#index >= this.#values.length) {
      throw new Error(`ScriptedRandom exhausted after ${this.#values.length} values`)
    }
    return this.#values[this.#index++]
  }

  get consumed(): number {
    return this.#index
  }
}
```

`test-support/chi-squared.ts`:

```ts
import { expect } from 'vitest'

/** Pearson chi-squared statistic against a uniform expectation. */
export function chiSquared(observed: readonly number[]): number {
  const total = observed.reduce((sum, o) => sum + o, 0)
  const expected = total / observed.length
  return observed.reduce((sum, o) => sum + (o - expected) ** 2 / expected, 0)
}

/** Critical value at p = 0.001 (Wilson–Hilferty approximation, accurate to ~0.3 for df ≥ 2). */
export function chiSquaredCritical(df: number): number {
  const z = 3.090232
  const a = 2 / (9 * df)
  return df * (1 - a + z * Math.sqrt(a)) ** 3
}

/** Fails the test if `observed` is not plausibly uniform at p = 0.001. */
export function expectUniform(observed: readonly number[], label = 'distribution'): void {
  const statistic = chiSquared(observed)
  const critical = chiSquaredCritical(observed.length - 1)
  expect(statistic, `${label}: chi² ${statistic.toFixed(1)} ≥ critical ${critical.toFixed(1)}`).toBeLessThan(critical)
}

/** Histogram of integer values in [0, n). */
export function countBy(n: number, values: Iterable<number>): number[] {
  const counts = new Array<number>(n).fill(0)
  for (const v of values) counts[v]++
  return counts
}
```

`test-support/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})

// jsdom lacks these browser APIs; Headless UI's anchored menus and transitions call them.
if (typeof window !== 'undefined') {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.getAnimations ??= () => []
  Element.prototype.scrollIntoView ??= () => {}
}
```

- [ ] **Step 10: Write the failing chi-squared self-test**

`test-support/chi-squared.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { chiSquared, chiSquaredCritical, countBy } from './chi-squared'
import { ScriptedRandom, SeededRandom } from './seeded-random'

describe('chiSquared', () => {
  it('is zero for a perfectly flat histogram', () => {
    expect(chiSquared([10, 10, 10])).toBe(0)
  })

  it('matches a hand-computed value', () => {
    expect(chiSquared([20, 0])).toBe(20)
  })
})

describe('chiSquaredCritical', () => {
  it.each([
    [9, 27.877],
    [15, 37.697],
    [17, 40.79],
  ])('approximates the p = 0.001 table value for df = %i', (df, table) => {
    expect(Math.abs(chiSquaredCritical(df) - table)).toBeLessThan(0.3)
  })
})

describe('countBy', () => {
  it('builds a histogram', () => {
    expect(countBy(3, [0, 2, 2, 1, 2])).toEqual([1, 1, 3])
  })
})

describe('SeededRandom', () => {
  it('is deterministic per seed and differs across seeds', () => {
    const a = new SeededRandom(1)
    const b = new SeededRandom(1)
    const c = new SeededRandom(2)
    const first = [a.nextUint32(), a.nextUint32()]
    expect([b.nextUint32(), b.nextUint32()]).toEqual(first)
    expect([c.nextUint32(), c.nextUint32()]).not.toEqual(first)
  })

  it('returns unsigned 32-bit integers', () => {
    const rng = new SeededRandom(7)
    for (let i = 0; i < 1000; i++) {
      const v = rng.nextUint32()
      expect(Number.isInteger(v) && v >= 0 && v <= 0xffffffff).toBe(true)
    }
  })
})

describe('ScriptedRandom', () => {
  it('replays values, counts consumption, then throws', () => {
    const rng = new ScriptedRandom([5, 6])
    expect(rng.nextUint32()).toBe(5)
    expect(rng.nextUint32()).toBe(6)
    expect(rng.consumed).toBe(2)
    expect(() => rng.nextUint32()).toThrow('exhausted')
  })
})
```

- [ ] **Step 11: Run the tests**

Run: `npm test`
Expected: PASS (all tests in `test-support/chi-squared.test.ts`). These helpers were written in Step 9, so this is a verification run; if any fail, fix the helper, not the test.

- [ ] **Step 12: Run lint, build and format**

```bash
npm run format
npm run lint
npm run build
```

Expected: all three succeed; `dist/index.html` exists.

- [ ] **Step 13: Commit**

```bash
git add -A
git status --short   # confirm nothing under tmp/ is staged
git commit -m "chore: add agent rules, MIT licence, pinned toolchain and test harness"
```

---

### Task 2: Randomness — `src/core/random.ts`

**Files:**
- Create: `src/core/random.ts`
- Test: `src/core/random.test.ts`
- Modify: `test-support/seeded-random.ts` (import the real `RandomSource` type)

**Interfaces:**
- Consumes: `SeededRandom`, `ScriptedRandom`, `expectUniform`, `countBy` from `test-support/`.
- Produces:
  ```ts
  export interface RandomSource { nextUint32(): number }
  export class InsecureRandomError extends Error {}
  export class SecureRandom implements RandomSource { nextUint32(): number }
  export const secureRandom: SecureRandom
  export function randomInt(rng: RandomSource, n: number): number        // uniform in [0, n)
  export function shuffle<T>(rng: RandomSource, items: readonly T[]): T[] // new array
  export function randomBytes(rng: RandomSource, count: number): Uint8Array
  ```

- [ ] **Step 1: Write the failing tests**

`src/core/random.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countBy, expectUniform } from '../../test-support/chi-squared'
import { ScriptedRandom, SeededRandom } from '../../test-support/seeded-random'
import { InsecureRandomError, SecureRandom, randomBytes, randomInt, shuffle } from './random'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('SecureRandom', () => {
  it('returns unsigned 32-bit integers', () => {
    const rng = new SecureRandom()
    for (let i = 0; i < 2000; i++) {
      const v = rng.nextUint32()
      expect(Number.isInteger(v) && v >= 0 && v <= 0xffffffff).toBe(true)
    }
  })

  it('refills a 4 KB buffer with one getRandomValues call per 1024 words', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues')
    const rng = new SecureRandom()
    for (let i = 0; i < 1024; i++) rng.nextUint32()
    expect(spy).toHaveBeenCalledTimes(1)
    expect((spy.mock.calls[0][0] as Uint32Array).byteLength).toBe(4096)
    rng.nextUint32()
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('produces different streams from independent instances', () => {
    const a = new SecureRandom()
    const b = new SecureRandom()
    const streamA = Array.from({ length: 8 }, () => a.nextUint32())
    const streamB = Array.from({ length: 8 }, () => b.nextUint32())
    expect(streamA).not.toEqual(streamB)
  })

  it('fails closed when crypto is missing', () => {
    vi.stubGlobal('crypto', undefined)
    expect(() => new SecureRandom().nextUint32()).toThrow(InsecureRandomError)
  })

  it('fails closed when getRandomValues throws', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(() => new SecureRandom().nextUint32()).toThrow(InsecureRandomError)
  })
})

describe('randomInt', () => {
  it('rejects values in the biased zone instead of reducing them (n = 3)', () => {
    // 2^32 mod 3 = 1, so the acceptance limit is 2^32 - 1 and 0xffffffff must be redrawn.
    const rng = new ScriptedRandom([0xffffffff, 5])
    expect(randomInt(rng, 3)).toBe(2)
    expect(rng.consumed).toBe(2)
  })

  it('rejects values in the biased zone instead of reducing them (n = 7776)', () => {
    // 2^32 mod 7776 = 2560, so the limit is 4294964736; that value and above are redrawn.
    const rng = new ScriptedRandom([4294964736, 0xffffffff, 4294964735])
    expect(randomInt(rng, 7776)).toBe(7775)
    expect(rng.consumed).toBe(3)
  })

  it('returns 0 for n = 1 using a single draw', () => {
    const rng = new ScriptedRandom([0xffffffff])
    expect(randomInt(rng, 1)).toBe(0)
    expect(rng.consumed).toBe(1)
  })

  it.each([0, -1, 1.5, Number.NaN, 2 ** 32 + 1])('throws RangeError for n = %s', (n) => {
    expect(() => randomInt(new SeededRandom(1), n)).toThrow(RangeError)
  })

  it.each([
    [3, 100_000],
    [100, 100_000],
    [7776, 200_000],
  ])('is uniform for n = %i', (n, samples) => {
    const rng = new SeededRandom(n)
    expectUniform(
      countBy(
        n,
        Array.from({ length: samples }, () => randomInt(rng, n)),
      ),
      `randomInt(${n})`,
    )
  })
})

describe('shuffle', () => {
  it('returns a permutation and leaves the input untouched', () => {
    const input = [1, 2, 3, 4, 5]
    const out = shuffle(new SeededRandom(3), input)
    expect(input).toEqual([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual(input)
  })

  it('makes all 6 permutations of 3 items equally likely', () => {
    const rng = new SeededRandom(11)
    const perms = ['abc', 'acb', 'bac', 'bca', 'cab', 'cba']
    const counts = new Array<number>(6).fill(0)
    for (let i = 0; i < 60_000; i++) counts[perms.indexOf(shuffle(rng, ['a', 'b', 'c']).join(''))]++
    expectUniform(counts, 'shuffle(3)')
  })
})

describe('randomBytes', () => {
  it('splits each 32-bit word into bytes, least significant first', () => {
    const rng = new ScriptedRandom([0x04030201, 0x08070605])
    expect(Array.from(randomBytes(rng, 6))).toEqual([1, 2, 3, 4, 5, 6])
    expect(rng.consumed).toBe(2)
  })

  it('returns exactly count bytes', () => {
    expect(randomBytes(new SeededRandom(1), 16)).toHaveLength(16)
    expect(randomBytes(new SeededRandom(1), 32)).toHaveLength(32)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/random.test.ts`
Expected: FAIL — `Failed to resolve import "./random"`.

- [ ] **Step 3: Implement `src/core/random.ts`**

```ts
// The only source of randomness in Pyrgus. See AGENTS.md → Security rules.

export interface RandomSource {
  /** An unsigned 32-bit integer, uniformly distributed. */
  nextUint32(): number
}

/** Thrown when the platform cannot provide cryptographically secure randomness. Never caught into a fallback. */
export class InsecureRandomError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'InsecureRandomError'
  }
}

const BUFFER_WORDS = 1024 // 4 KB, well under getRandomValues' 65,536-byte limit
const TWO_POW_32 = 0x1_0000_0000

/** crypto.getRandomValues, buffered. Fails closed. */
export class SecureRandom implements RandomSource {
  #buffer = new Uint32Array(BUFFER_WORDS)
  #index = BUFFER_WORDS

  nextUint32(): number {
    if (this.#index >= BUFFER_WORDS) this.#refill()
    return this.#buffer[this.#index++]
  }

  #refill(): void {
    const cryptoApi = globalThis.crypto
    if (typeof cryptoApi?.getRandomValues !== 'function') {
      throw new InsecureRandomError('crypto.getRandomValues is unavailable')
    }
    try {
      cryptoApi.getRandomValues(this.#buffer)
    } catch (cause) {
      throw new InsecureRandomError('crypto.getRandomValues failed', { cause })
    }
    this.#index = 0
  }
}

export const secureRandom = new SecureRandom()

/** Uniform integer in [0, n) by rejection sampling: never a bare `x % n`. */
export function randomInt(rng: RandomSource, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > TWO_POW_32) {
    throw new RangeError(`randomInt: n must be an integer in [1, 2^32], got ${n}`)
  }
  const limit = TWO_POW_32 - (TWO_POW_32 % n) // = floor(2^32 / n) * n
  let x = rng.nextUint32()
  while (x >= limit) x = rng.nextUint32()
  return x % n
}

/** Fisher–Yates. Returns a new array. */
export function shuffle<T>(rng: RandomSource, items: readonly T[]): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(rng, i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** `count` random bytes; each 32-bit draw supplies four bytes, least significant first. */
export function randomBytes(rng: RandomSource, count: number): Uint8Array {
  const out = new Uint8Array(count)
  for (let i = 0; i < count; i += 4) {
    const word = rng.nextUint32()
    for (let b = 0; b < 4 && i + b < count; b++) out[i + b] = (word >>> (8 * b)) & 0xff
  }
  return out
}
```

- [ ] **Step 4: Point the test helpers at the real interface**

In `test-support/seeded-random.ts`, replace the local interface block:

```ts
/** Structural copy of src/core/random.ts's RandomSource, so this file has no dependency on it. */
interface RandomSource {
  nextUint32(): number
}
```

with:

```ts
import type { RandomSource } from '../src/core/random'
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/core/random.test.ts test-support`
Expected: PASS.

- [ ] **Step 6: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/core/random.ts src/core/random.test.ts test-support/seeded-random.ts
git commit -m "feat(core): add fail-closed CSPRNG with unbiased randomInt, shuffle and randomBytes"
```

---

### Task 3: Format data — charsets, formats, wordlist, test vectors

**Files:**
- Create: `src/core/charsets.ts`, `src/core/formats.ts`, `src/core/wordlist.ts` (generated), `src/core/test-vectors.json`
- Test: `src/core/charsets.test.ts`, `src/core/formats.test.ts`, `src/core/wordlist.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  ```ts
  // charsets.ts
  export const LOWER, UPPER, DIGITS, SYMBOLS, HEX: string
  export const STANDARD_LOWER, STANDARD_UPPER, STANDARD_DIGITS: string
  export const STRONG_BASE: string
  // formats.ts
  export type FormatId = 'standard' | 'strong' | 'memorable' | 'pin' | 'secret128' | 'secret256'
  export type PinLength = 4 | 6 | 8
  export type Options = { pinLength: PinLength }
  export type CharacterSpec = { kind: 'chars'; length: number; base: string; required: readonly string[]; groupSize?: number; separator?: string }
  export type WordSpec = { kind: 'words'; wordCount: 4; suffixDigits: 2; separator: '-' }
  export type HexSpec = { kind: 'hex'; byteCount: 16 | 32 }
  export type FormatSpec = CharacterSpec | WordSpec | HexSpec
  export const FORMAT_IDS: readonly FormatId[]
  export const PIN_LENGTHS: readonly PinLength[]
  export const DEFAULT_FORMAT: FormatId          // 'standard'
  export const DEFAULT_OPTIONS: Options          // { pinLength: 6 }
  export const FORMAT_LABELS: Record<FormatId, string>
  export const FORMAT_GROUPS: readonly { heading: string; ids: readonly FormatId[] }[]
  export function formatSpec(id: FormatId, options: Options): FormatSpec
  export function isFormatId(value: unknown): value is FormatId
  export function isPinLength(value: unknown): value is PinLength
  // wordlist.ts
  export const WORDLIST: readonly string[]
  ```

- [ ] **Step 1: Write `src/core/test-vectors.json`**

```json
{
  "version": 1,
  "alphabets": {
    "standardLower": "abcdefghijkmnopqrstuvwxyz",
    "standardUpper": "ABCDEFGHJKLMNPQRSTUVWXYZ",
    "standardDigits": "23456789",
    "strongLower": "abcdefghijklmnopqrstuvwxyz",
    "strongUpper": "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    "strongDigits": "0123456789",
    "strongSymbols": "!@#$%^&*-_=+?",
    "pin": "0123456789",
    "hex": "0123456789abcdef"
  },
  "entropy": {
    "standard": { "bits": 90.144, "display": "90.1" },
    "strong": { "bits": 149.4916, "display": "~149" },
    "memorable": { "bits": 58.3431, "display": "58.3" },
    "pin4": { "bits": 13.2877, "display": "13.3" },
    "pin6": { "bits": 19.9316, "display": "19.9" },
    "pin8": { "bits": 26.5754, "display": "26.6" },
    "secret128": { "bits": 128, "display": "128" },
    "secret256": { "bits": 256, "display": "256" }
  },
  "wordlist": {
    "count": 7776,
    "first": "abacus",
    "last": "zoom",
    "sha256": "addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e"
  }
}
```

- [ ] **Step 2: Write the failing charset and format tests**

`src/core/charsets.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DIGITS,
  HEX,
  LOWER,
  STANDARD_DIGITS,
  STANDARD_LOWER,
  STANDARD_UPPER,
  STRONG_BASE,
  SYMBOLS,
  UPPER,
} from './charsets'
import vectors from './test-vectors.json'

const without = (alphabet: string, excluded: string) => [...alphabet].filter((c) => !excluded.includes(c)).join('')

describe('charsets', () => {
  it('match the cross-platform vectors', () => {
    expect(STANDARD_LOWER).toBe(vectors.alphabets.standardLower)
    expect(STANDARD_UPPER).toBe(vectors.alphabets.standardUpper)
    expect(STANDARD_DIGITS).toBe(vectors.alphabets.standardDigits)
    expect(LOWER).toBe(vectors.alphabets.strongLower)
    expect(UPPER).toBe(vectors.alphabets.strongUpper)
    expect(DIGITS).toBe(vectors.alphabets.strongDigits)
    expect(SYMBOLS).toBe(vectors.alphabets.strongSymbols)
    expect(HEX).toBe(vectors.alphabets.hex)
  })

  it('derive the Standard sets by excluding exactly l, O, I, 0, 1', () => {
    expect(STANDARD_LOWER).toBe(without(LOWER, 'l'))
    expect(STANDARD_UPPER).toBe(without(UPPER, 'OI'))
    expect(STANDARD_DIGITS).toBe(without(DIGITS, '01'))
  })

  it('have the documented sizes', () => {
    expect([STANDARD_LOWER.length, STANDARD_UPPER.length, STANDARD_DIGITS.length]).toEqual([25, 24, 8])
    expect(SYMBOLS).toHaveLength(13)
    expect(STRONG_BASE).toHaveLength(75)
  })

  it('exclude quotes, backslash and backtick from symbols', () => {
    for (const c of `'"\\\``) expect(SYMBOLS).not.toContain(c)
  })

  it('have no duplicate characters', () => {
    for (const set of [STANDARD_LOWER, STANDARD_UPPER, STANDARD_DIGITS, STRONG_BASE, HEX]) {
      expect(new Set(set).size).toBe(set.length)
    }
  })
})
```

`src/core/formats.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FORMAT,
  DEFAULT_OPTIONS,
  FORMAT_GROUPS,
  FORMAT_IDS,
  FORMAT_LABELS,
  PIN_LENGTHS,
  formatSpec,
  isFormatId,
  isPinLength,
} from './formats'

describe('formats', () => {
  it('lists six formats with Standard as the default', () => {
    expect(FORMAT_IDS).toEqual(['standard', 'strong', 'memorable', 'pin', 'secret128', 'secret256'])
    expect(DEFAULT_FORMAT).toBe('standard')
    expect(DEFAULT_OPTIONS).toEqual({ pinLength: 6 })
  })

  it('groups every format exactly once under Passwords and Secrets', () => {
    expect(FORMAT_GROUPS.map((g) => g.heading)).toEqual(['Passwords', 'Secrets'])
    expect(FORMAT_GROUPS.flatMap((g) => g.ids)).toEqual([...FORMAT_IDS])
  })

  it('labels every format', () => {
    expect(FORMAT_LABELS).toEqual({
      standard: 'Standard',
      strong: 'Strong',
      memorable: 'Memorable',
      pin: 'PIN',
      secret128: 'Secret 128',
      secret256: 'Secret 256',
    })
  })

  it('only PIN reads the options', () => {
    for (const id of FORMAT_IDS) {
      if (id === 'pin') continue
      expect(formatSpec(id, { pinLength: 4 })).toEqual(formatSpec(id, { pinLength: 8 }))
    }
    for (const pinLength of PIN_LENGTHS) {
      expect(formatSpec('pin', { pinLength })).toMatchObject({ kind: 'chars', length: pinLength, required: [] })
    }
  })

  it('describes Standard and the Secrets as documented', () => {
    expect(formatSpec('standard', DEFAULT_OPTIONS)).toMatchObject({
      kind: 'chars',
      length: 18,
      groupSize: 6,
      separator: '-',
    })
    expect(formatSpec('secret128', DEFAULT_OPTIONS)).toEqual({ kind: 'hex', byteCount: 16 })
    expect(formatSpec('secret256', DEFAULT_OPTIONS)).toEqual({ kind: 'hex', byteCount: 32 })
  })

  it('guards stored values', () => {
    expect(isFormatId('secret256')).toBe(true)
    for (const bad of ['', 'Standard', 'secret512', null, undefined, 6]) expect(isFormatId(bad)).toBe(false)
    expect(PIN_LENGTHS.every(isPinLength)).toBe(true)
    for (const bad of [0, 5, 7, '6', NaN, null]) expect(isPinLength(bad)).toBe(false)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/core/charsets.test.ts src/core/formats.test.ts`
Expected: FAIL — `Failed to resolve import "./charsets"` / `"./formats"`.

- [ ] **Step 4: Implement `src/core/charsets.ts`**

```ts
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
```

- [ ] **Step 5: Implement `src/core/formats.ts`**

```ts
import { DIGITS, LOWER, STANDARD_DIGITS, STANDARD_LOWER, STANDARD_UPPER, STRONG_BASE, SYMBOLS, UPPER } from './charsets'

export type FormatId = 'standard' | 'strong' | 'memorable' | 'pin' | 'secret128' | 'secret256'
export type PinLength = 4 | 6 | 8
export type Options = { pinLength: PinLength }

export type CharacterSpec = {
  kind: 'chars'
  length: number
  base: string
  /** One character from each set is placed at a distinct, uniformly chosen position. */
  required: readonly string[]
  groupSize?: number
  separator?: string
}
export type WordSpec = { kind: 'words'; wordCount: 4; suffixDigits: 2; separator: '-' }
export type HexSpec = { kind: 'hex'; byteCount: 16 | 32 }
export type FormatSpec = CharacterSpec | WordSpec | HexSpec

export const FORMAT_IDS: readonly FormatId[] = ['standard', 'strong', 'memorable', 'pin', 'secret128', 'secret256']
export const PIN_LENGTHS: readonly PinLength[] = [4, 6, 8]
export const DEFAULT_FORMAT: FormatId = 'standard'
export const DEFAULT_OPTIONS: Options = { pinLength: 6 }

export const FORMAT_LABELS: Record<FormatId, string> = {
  standard: 'Standard',
  strong: 'Strong',
  memorable: 'Memorable',
  pin: 'PIN',
  secret128: 'Secret 128',
  secret256: 'Secret 256',
}

export const FORMAT_GROUPS: readonly { heading: string; ids: readonly FormatId[] }[] = [
  { heading: 'Passwords', ids: ['standard', 'strong', 'memorable', 'pin'] },
  { heading: 'Secrets', ids: ['secret128', 'secret256'] },
]

/** The presets, as data. Adding a format is a new entry here, not a new code path. */
const SPECS: Record<FormatId, (options: Options) => FormatSpec> = {
  standard: () => ({
    kind: 'chars',
    length: 18,
    base: STANDARD_LOWER,
    required: [STANDARD_UPPER, STANDARD_DIGITS],
    groupSize: 6,
    separator: '-',
  }),
  strong: () => ({ kind: 'chars', length: 24, base: STRONG_BASE, required: [LOWER, UPPER, DIGITS, SYMBOLS] }),
  memorable: () => ({ kind: 'words', wordCount: 4, suffixDigits: 2, separator: '-' }),
  pin: ({ pinLength }) => ({ kind: 'chars', length: pinLength, base: DIGITS, required: [] }),
  secret128: () => ({ kind: 'hex', byteCount: 16 }),
  secret256: () => ({ kind: 'hex', byteCount: 32 }),
}

export function formatSpec(id: FormatId, options: Options): FormatSpec {
  return SPECS[id](options)
}

export function isFormatId(value: unknown): value is FormatId {
  return typeof value === 'string' && (FORMAT_IDS as readonly string[]).includes(value)
}

export function isPinLength(value: unknown): value is PinLength {
  return typeof value === 'number' && (PIN_LENGTHS as readonly number[]).includes(value)
}
```

- [ ] **Step 6: Run the charset and format tests**

Run: `npx vitest run src/core/charsets.test.ts src/core/formats.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing wordlist test**

`src/core/wordlist.test.ts`:

```ts
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
```

- [ ] **Step 8: Run it to verify it fails**

Run: `npx vitest run src/core/wordlist.test.ts`
Expected: FAIL — `Failed to resolve import "./wordlist"`.

- [ ] **Step 9: Generate `src/core/wordlist.ts` from EFF's file**

```bash
curl -sSfL -o tmp/eff_large_wordlist.txt https://www.eff.org/files/2016/07/18/eff_large_wordlist.txt
shasum -a 256 tmp/eff_large_wordlist.txt
```

Expected hash: `addd35536511597a02fa0a9ff1e5284677b8883b83e986e43f15a3db996b903e`. **Stop if it differs.**

```bash
node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from 'node:fs'
const words = readFileSync('tmp/eff_large_wordlist.txt', 'utf8')
  .trimEnd()
  .split('\n')
  .map((line) => line.split('\t')[1])
const header = [
  '// EFF long wordlist (7,776 words): https://www.eff.org/dice',
  '// Licensed CC BY 3.0 US by the Electronic Frontier Foundation.',
  '// Generated from eff_large_wordlist.txt; do not edit. wordlist.test.ts verifies it byte-for-byte.',
  '',
  '',
].join('\n')
const body = `export const WORDLIST: readonly string[] = Object.freeze([\n${words.map((w) => `  '${w}',`).join('\n')}\n])\n`
writeFileSync('src/core/wordlist.ts', header + body)
EOF
```

- [ ] **Step 10: Run the wordlist test**

Run: `npx vitest run src/core/wordlist.test.ts`
Expected: PASS.

- [ ] **Step 11: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/core/charsets.ts src/core/charsets.test.ts src/core/formats.ts src/core/formats.test.ts src/core/wordlist.ts src/core/wordlist.test.ts src/core/test-vectors.json
git commit -m "feat(core): add alphabets, format presets, EFF wordlist and cross-platform vectors"
```

---

### Task 4: Generation — `src/core/generate.ts`

**Files:**
- Create: `src/core/generate.ts`
- Test: `src/core/generate.test.ts`

**Interfaces:**
- Consumes: `RandomSource`, `secureRandom`, `randomInt`, `shuffle`, `randomBytes` (Task 2); `formatSpec`, `FormatId`, `Options`, `CharacterSpec`, `WordSpec`, `HexSpec`, `DEFAULT_OPTIONS`, `PIN_LENGTHS` (Task 3); `WORDLIST` (Task 3); charsets (Task 3).
- Produces: `export function generate(id: FormatId, options: Options, rng?: RandomSource): string` — `rng` defaults to `secureRandom`; throws `InsecureRandomError` if randomness is unavailable.

- [ ] **Step 1: Write the failing tests**

`src/core/generate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { countBy, expectUniform } from '../../test-support/chi-squared'
import { ScriptedRandom, SeededRandom } from '../../test-support/seeded-random'
import { DIGITS, LOWER, STANDARD_DIGITS, STANDARD_LOWER, STANDARD_UPPER, STRONG_BASE, SYMBOLS, UPPER } from './charsets'
import { DEFAULT_OPTIONS, FORMAT_IDS, PIN_LENGTHS } from './formats'
import { generate } from './generate'
import { randomInt, type RandomSource } from './random'
import { WORDLIST } from './wordlist'

const count = (s: string, set: string) => [...s].filter((c) => set.includes(c)).length

describe('generate — shape', () => {
  it('Standard: 18 chars in 6-6-6, exactly one uppercase and one digit, no ambiguous characters', () => {
    const rng = new SeededRandom(1)
    for (let i = 0; i < 2000; i++) {
      const pw = generate('standard', DEFAULT_OPTIONS, rng)
      expect(pw).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
      const raw = pw.replaceAll('-', '')
      expect(count(raw, STANDARD_UPPER)).toBe(1)
      expect(count(raw, STANDARD_DIGITS)).toBe(1)
      expect(count(raw, STANDARD_LOWER)).toBe(16)
      expect(raw).not.toMatch(/[lOI01]/)
    }
  })

  it('Strong: 24 chars from the 75-char base with every class present', () => {
    const rng = new SeededRandom(2)
    for (let i = 0; i < 2000; i++) {
      const pw = generate('strong', DEFAULT_OPTIONS, rng)
      expect(pw).toHaveLength(24)
      expect([...pw].every((c) => STRONG_BASE.includes(c))).toBe(true)
      for (const set of [LOWER, UPPER, DIGITS, SYMBOLS]) expect(count(pw, set)).toBeGreaterThanOrEqual(1)
    }
  })

  it('Memorable: four wordlist words then a zero-padded two-digit suffix', () => {
    const rng = new ScriptedRandom([0, 1, 7775, 3, 7])
    expect(generate('memorable', DEFAULT_OPTIONS, rng)).toBe(
      `${WORDLIST[0]}-${WORDLIST[1]}-${WORDLIST[7775]}-${WORDLIST[3]}-07`,
    )
  })

  it('Memorable: always ends in -NN', () => {
    const rng = new SeededRandom(3)
    for (let i = 0; i < 500; i++) expect(generate('memorable', DEFAULT_OPTIONS, rng)).toMatch(/^[a-z-]+-\d{2}$/)
  })

  it.each(PIN_LENGTHS)('PIN %i: exactly that many digits', (pinLength) => {
    const rng = new SeededRandom(pinLength)
    for (let i = 0; i < 500; i++) {
      expect(generate('pin', { pinLength }, rng)).toMatch(new RegExp(`^\\d{${pinLength}}$`))
    }
  })

  it.each([
    ['secret128', 32],
    ['secret256', 64],
  ] as const)('%s: %i lowercase hex characters, no separators', (id, length) => {
    const rng = new SeededRandom(4)
    for (let i = 0; i < 500; i++) expect(generate(id, DEFAULT_OPTIONS, rng)).toMatch(new RegExp(`^[0-9a-f]{${length}}$`))
  })

  it('hex encodes bytes in order, lowercase, zero-padded', () => {
    const rng = new ScriptedRandom([0x04030201, 0x08070605, 0x0c0b0a09, 0x100f0e0d])
    expect(generate('secret128', DEFAULT_OPTIONS, rng)).toBe('0102030405060708090a0b0c0d0e0f10')
  })
})

describe('generate — determinism', () => {
  it.each(FORMAT_IDS)('%s is reproducible with the same seed', (id) => {
    expect(generate(id, DEFAULT_OPTIONS, new SeededRandom(42))).toBe(generate(id, DEFAULT_OPTIONS, new SeededRandom(42)))
    expect(generate(id, DEFAULT_OPTIONS, new SeededRandom(42))).not.toBe(generate(id, DEFAULT_OPTIONS, new SeededRandom(43)))
  })

  it('uses the secure generator by default', () => {
    expect(generate('standard', DEFAULT_OPTIONS)).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
  })
})

/** Positions (0–17) of the uppercase letter and the digit in an ungrouped Standard password. */
function standardPositions(pw: string): { upper: number; digit: number } {
  const raw = [...pw.replaceAll('-', '')]
  return {
    upper: raw.findIndex((c) => STANDARD_UPPER.includes(c)),
    digit: raw.findIndex((c) => STANDARD_DIGITS.includes(c)),
  }
}

/** Offset of the digit from the uppercase letter, 1–17, mapped to a 0–16 bin. */
const offsetBin = ({ upper, digit }: { upper: number; digit: number }) => (digit - upper + 18) % 18 - 1

describe('generate — uniformity', () => {
  const SAMPLES = 100_000

  it('Standard: uppercase position, digit position and their offset are all flat', () => {
    const rng = new SeededRandom(2026)
    const samples = Array.from({ length: SAMPLES }, () => standardPositions(generate('standard', DEFAULT_OPTIONS, rng)))
    expectUniform(countBy(18, samples.map((s) => s.upper)), 'uppercase position')
    expectUniform(countBy(18, samples.map((s) => s.digit)), 'digit position')
    expectUniform(countBy(17, samples.map(offsetBin)), 'digit − uppercase offset')
  })

  it("the offset test detects 2.0's collision bias (proves the test has power)", () => {
    // 2.0: pick both positions independently; on collision, digit = (digit + 1) % 18.
    const legacy = (rng: RandomSource) => {
      const upper = randomInt(rng, 18)
      let digit = randomInt(rng, 18)
      if (digit === upper) digit = (digit + 1) % 18
      return { upper, digit }
    }
    const rng = new SeededRandom(2026)
    const offsets = countBy(17, Array.from({ length: SAMPLES }, () => offsetBin(legacy(rng))))
    expect(() => expectUniform(offsets, 'legacy offset')).toThrow()
  })

  it('hex nibbles are flat across both Secret formats', () => {
    const rng = new SeededRandom(99)
    const nibbles: number[] = []
    for (let i = 0; i < 5_000; i++) {
      for (const c of generate('secret128', DEFAULT_OPTIONS, rng) + generate('secret256', DEFAULT_OPTIONS, rng)) {
        nibbles.push(parseInt(c, 16))
      }
    }
    expectUniform(countBy(16, nibbles), 'hex nibbles')
  })

  it.each(PIN_LENGTHS)('PIN %i: digits are flat at every position', (pinLength) => {
    const rng = new SeededRandom(pinLength * 1000)
    const pins = Array.from({ length: 20_000 }, () => generate('pin', { pinLength }, rng))
    for (let pos = 0; pos < pinLength; pos++) {
      expectUniform(countBy(10, pins.map((p) => Number(p[pos]))), `PIN ${pinLength} position ${pos}`)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/generate.test.ts`
Expected: FAIL — `Failed to resolve import "./generate"`.

- [ ] **Step 3: Implement `src/core/generate.ts`**

```ts
import { formatSpec, type CharacterSpec, type FormatId, type HexSpec, type Options, type WordSpec } from './formats'
import { randomBytes, randomInt, secureRandom, shuffle, type RandomSource } from './random'
import { WORDLIST } from './wordlist'

/** Generates a secret. Throws InsecureRandomError if secure randomness is unavailable; never falls back. */
export function generate(id: FormatId, options: Options, rng: RandomSource = secureRandom): string {
  const spec = formatSpec(id, options)
  switch (spec.kind) {
    case 'chars':
      return generateChars(spec, rng)
    case 'words':
      return generateWords(spec, rng)
    case 'hex':
      return generateHex(spec, rng)
  }
}

function pick(rng: RandomSource, alphabet: string): string {
  return alphabet[randomInt(rng, alphabet.length)]
}

function generateChars(spec: CharacterSpec, rng: RandomSource): string {
  // 1. Fill every position from the base set.
  const chars = Array.from({ length: spec.length }, () => pick(rng, spec.base))
  if (spec.required.length > 0) {
    // 2. Shuffle the position indices and take the first k: distinct and uniform by construction
    //    (this replaces 2.0's biased "digitIndex + 1" collision rule).
    const positions = shuffle(
      rng,
      chars.map((_, i) => i),
    )
    // 3. Overwrite those positions from their required sets.
    spec.required.forEach((set, k) => {
      chars[positions[k]] = pick(rng, set)
    })
  }
  // 4. Group, if the format groups.
  return group(chars.join(''), spec.groupSize, spec.separator)
}

function group(value: string, size: number | undefined, separator: string | undefined): string {
  if (size === undefined || separator === undefined) return value
  const chunks: string[] = []
  for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size))
  return chunks.join(separator)
}

function generateWords(spec: WordSpec, rng: RandomSource): string {
  const words = Array.from({ length: spec.wordCount }, () => WORDLIST[randomInt(rng, WORDLIST.length)])
  const suffix = String(randomInt(rng, 10 ** spec.suffixDigits)).padStart(spec.suffixDigits, '0')
  return [...words, suffix].join(spec.separator)
}

function generateHex(spec: HexSpec, rng: RandomSource): string {
  return Array.from(randomBytes(rng, spec.byteCount), (b) => b.toString(16).padStart(2, '0')).join('')
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/core/generate.test.ts`
Expected: PASS (the uniformity block takes a few seconds).

- [ ] **Step 5: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/core/generate.ts src/core/generate.test.ts
git commit -m "feat(core): generate all six formats with bias-free required-character placement"
```

---

### Task 5: Entropy — `src/core/entropy.ts`

**Files:**
- Create: `src/core/entropy.ts`
- Test: `src/core/entropy.test.ts`

**Interfaces:**
- Consumes: `formatSpec`, `FormatId`, `Options`, `CharacterSpec`, `PIN_LENGTHS`, `DEFAULT_OPTIONS` (Task 3); `WORDLIST` (Task 3).
- Produces:
  ```ts
  export function entropyBits(id: FormatId, options: Options): number
  export function isExactEntropy(id: FormatId, options: Options): boolean
  export function formatEntropy(id: FormatId, options: Options): string // "90.1", "~149", "128"
  ```

- [ ] **Step 1: Write the failing tests**

`src/core/entropy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { entropyBits, formatEntropy, isExactEntropy } from './entropy'
import { DEFAULT_OPTIONS, PIN_LENGTHS, type FormatId, type Options } from './formats'
import vectors from './test-vectors.json'

const cases: [keyof typeof vectors.entropy, FormatId, Options][] = [
  ['standard', 'standard', DEFAULT_OPTIONS],
  ['strong', 'strong', DEFAULT_OPTIONS],
  ['memorable', 'memorable', DEFAULT_OPTIONS],
  ['pin4', 'pin', { pinLength: 4 }],
  ['pin6', 'pin', { pinLength: 6 }],
  ['pin8', 'pin', { pinLength: 8 }],
  ['secret128', 'secret128', DEFAULT_OPTIONS],
  ['secret256', 'secret256', DEFAULT_OPTIONS],
]

describe('entropy', () => {
  it.each(cases)('%s matches the cross-platform vectors', (key, id, options) => {
    expect(entropyBits(id, options)).toBeCloseTo(vectors.entropy[key].bits, 3)
    expect(formatEntropy(id, options)).toBe(vectors.entropy[key].display)
  })

  it('computes Standard from the documented formula', () => {
    const expected = Math.log2(18 * 17 * 24 * 8) + 16 * Math.log2(25)
    expect(entropyBits('standard', DEFAULT_OPTIONS)).toBeCloseTo(expected, 10)
  })

  it('computes Memorable and PIN from the documented formulas', () => {
    expect(entropyBits('memorable', DEFAULT_OPTIONS)).toBeCloseTo(4 * Math.log2(7776) + Math.log2(100), 10)
    for (const pinLength of PIN_LENGTHS) {
      expect(entropyBits('pin', { pinLength })).toBeCloseTo(pinLength * Math.log2(10), 10)
    }
  })

  it('marks only Strong as approximate', () => {
    expect(isExactEntropy('strong', DEFAULT_OPTIONS)).toBe(false)
    for (const id of ['standard', 'memorable', 'pin', 'secret128', 'secret256'] as const) {
      expect(isExactEntropy(id, DEFAULT_OPTIONS)).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/core/entropy.test.ts`
Expected: FAIL — `Failed to resolve import "./entropy"`.

- [ ] **Step 3: Implement `src/core/entropy.ts`**

```ts
import { formatSpec, type CharacterSpec, type FormatId, type Options } from './formats'
import { WORDLIST } from './wordlist'

/** log2 of the number of distinct strings the generator can produce, computed from the spec data. */
export function entropyBits(id: FormatId, options: Options): number {
  const spec = formatSpec(id, options)
  switch (spec.kind) {
    case 'hex':
      return spec.byteCount * 8
    case 'words':
      return spec.wordCount * Math.log2(WORDLIST.length) + spec.suffixDigits * Math.log2(10)
    case 'chars':
      return charsEntropy(spec)
  }
}

/** False when required sets overlap the base set (Strong): the figure is then an upper-bound approximation. */
export function isExactEntropy(id: FormatId, options: Options): boolean {
  const spec = formatSpec(id, options)
  return spec.kind !== 'chars' || requiredSetsAreDisjoint(spec)
}

/** Display form: "90.1" (exact), "128" (exact integer), "~149" (approximate, rounded down). */
export function formatEntropy(id: FormatId, options: Options): string {
  const bits = entropyBits(id, options)
  if (!isExactEntropy(id, options)) return `~${Math.floor(bits)}`
  return Number.isInteger(bits) ? String(bits) : bits.toFixed(1)
}

function requiredSetsAreDisjoint(spec: CharacterSpec): boolean {
  const sets = [spec.base, ...spec.required]
  const seen = new Set<string>()
  for (const set of sets) {
    for (const c of set) {
      if (seen.has(c)) return false
      seen.add(c)
    }
  }
  return true
}

function charsEntropy(spec: CharacterSpec): number {
  const k = spec.required.length
  if (!requiredSetsAreDisjoint(spec)) {
    // Overlapping sets: every position is effectively drawn from the base set.
    return spec.length * Math.log2(spec.base.length)
  }
  // Exact: ordered choice of k distinct positions × one character per required set × base for the rest.
  let bits = (spec.length - k) * Math.log2(spec.base.length)
  for (let i = 0; i < k; i++) bits += Math.log2(spec.length - i) + Math.log2(spec.required[i].length)
  return bits
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/core/entropy.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/core/entropy.ts src/core/entropy.test.ts
git commit -m "feat(core): compute and format entropy from format data"
```

---

### Task 6: Browser helpers — clipboard, preferences, spoken form

**Files:**
- Create: `src/lib/clipboard.ts`, `src/lib/preferences.ts`, `src/lib/spell.ts`
- Test: `src/lib/clipboard.test.ts`, `src/lib/preferences.test.ts`, `src/lib/spell.test.ts`

**Interfaces:**
- Consumes: `FormatId`, `PinLength`, `DEFAULT_FORMAT`, `DEFAULT_OPTIONS`, `isFormatId`, `isPinLength` (Task 3).
- Produces:
  ```ts
  // clipboard.ts
  export const CLEAR_AFTER_MS = 90_000
  export function copySecret(secret: string): Promise<void>  // rejects if writeText fails; then no clear is scheduled
  export function cancelPendingClear(): void
  // preferences.ts
  export const FORMAT_KEY = 'pyrgus.format'
  export const PIN_LENGTH_KEY = 'pyrgus.pinLength'
  export function readFormat(): FormatId
  export function readPinLength(): PinLength
  export function writeFormat(id: FormatId): void
  export function writePinLength(n: PinLength): void
  // spell.ts
  export function spell(secret: string): string
  ```

- [ ] **Step 1: Write the failing clipboard tests**

`src/lib/clipboard.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLEAR_AFTER_MS, cancelPendingClear, copySecret } from './clipboard'

let clipboardText: string
let focused: boolean
const writeText = vi.fn(async (text: string) => {
  clipboardText = text
})
const readText = vi.fn(async () => clipboardText)

beforeEach(() => {
  clipboardText = ''
  focused = true
  writeText.mockClear()
  readText.mockClear()
  vi.useFakeTimers()
  vi.stubGlobal('navigator', { clipboard: { writeText, readText } })
  vi.stubGlobal('document', { hasFocus: () => focused })
})

afterEach(() => {
  cancelPendingClear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  writeText.mockImplementation(async (text: string) => {
    clipboardText = text
  })
  readText.mockImplementation(async () => clipboardText)
})

describe('copySecret', () => {
  it('writes the secret to the clipboard', async () => {
    await copySecret('abc')
    expect(writeText).toHaveBeenCalledWith('abc')
  })

  it('clears after 90 s when focused and the clipboard still holds the secret', async () => {
    await copySecret('abc')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS - 1)
    expect(clipboardText).toBe('abc')
    await vi.advanceTimersByTimeAsync(1)
    expect(clipboardText).toBe('')
  })

  it('never clears something the user copied afterwards', async () => {
    await copySecret('abc')
    clipboardText = 'user copied this'
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(clipboardText).toBe('user copied this')
  })

  it('does not clear, or even read, while the tab is unfocused', async () => {
    await copySecret('abc')
    focused = false
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(readText).not.toHaveBeenCalled()
    expect(clipboardText).toBe('abc')
  })

  it('does nothing when the read is refused', async () => {
    readText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    await copySecret('abc')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(clipboardText).toBe('abc')
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('a newer copy cancels the older pending clear', async () => {
    await copySecret('first')
    await vi.advanceTimersByTimeAsync(60_000)
    await copySecret('second')
    await vi.advanceTimersByTimeAsync(30_000) // 90 s after the first copy
    expect(readText).not.toHaveBeenCalled()
    expect(clipboardText).toBe('second')
    await vi.advanceTimersByTimeAsync(60_000) // 90 s after the second copy
    expect(readText).toHaveBeenCalledTimes(1)
    expect(clipboardText).toBe('')
  })

  it('rejects, and schedules no clear, when the write is refused', async () => {
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    await expect(copySecret('abc')).rejects.toThrow('denied')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(readText).not.toHaveBeenCalled()
  })

  it.each(['new copy', 'cancel', 'blur'] as const)(
    'does not clear after %s occurs during a delayed read',
    async (action) => {
      let resolveRead!: (value: string) => void
      readText.mockImplementationOnce(() => new Promise<string>((resolve) => { resolveRead = resolve }))
      await copySecret('old')
      await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
      expect(readText).toHaveBeenCalledTimes(1)

      if (action === 'new copy') await copySecret('new')
      else if (action === 'cancel') cancelPendingClear()
      else focused = false

      resolveRead('old') // Snapshot taken before the intervening action.
      await vi.advanceTimersByTimeAsync(0)
      expect(clipboardText).toBe(action === 'new copy' ? 'new' : 'old')
      expect(writeText).not.toHaveBeenCalledWith('')
    },
  )

  it('invalidates an in-flight clear as soon as a new write starts', async () => {
    let resolveRead!: (value: string) => void
    let resolveWrite!: () => void
    readText.mockImplementationOnce(() => new Promise<string>((resolve) => { resolveRead = resolve }))
    await copySecret('old')
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    writeText.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveWrite = resolve }))
    const pendingCopy = copySecret('new')
    resolveRead('old')
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).not.toHaveBeenCalledWith('')
    clipboardText = 'new'
    resolveWrite()
    await pendingCopy
  })

  it('an older write completing late cannot replace the newer clear timer', async () => {
    let resolveWrite!: () => void
    // Delay acknowledgement of the first write; the clipboard already contains its value.
    writeText.mockImplementationOnce((text) => {
      clipboardText = text
      return new Promise<void>((resolve) => { resolveWrite = resolve })
    })
    const first = copySecret('first')
    await copySecret('second')
    await vi.advanceTimersByTimeAsync(1000)
    resolveWrite()
    await first
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS - 1000)
    expect(readText).toHaveBeenCalledTimes(1)
    expect(clipboardText).toBe('')
  })

  it('cancellation during a pending write prevents a later clear timer', async () => {
    let resolveWrite!: () => void
    writeText.mockImplementationOnce(() => new Promise<void>((resolve) => { resolveWrite = resolve }))
    const pendingCopy = copySecret('abc')
    cancelPendingClear()
    resolveWrite()
    await pendingCopy
    await vi.advanceTimersByTimeAsync(CLEAR_AFTER_MS)
    expect(readText).not.toHaveBeenCalled()
  })

  it('rejects when the Clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {})
    await expect(copySecret('abc')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Write the failing preferences and spell tests**

`src/lib/preferences.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FORMAT_KEY, PIN_LENGTH_KEY, readFormat, readPinLength, writeFormat, writePinLength } from './preferences'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('preferences', () => {
  it('defaults to Standard and 6 when nothing is stored', () => {
    expect(readFormat()).toBe('standard')
    expect(readPinLength()).toBe(6)
  })

  it('round-trips valid values', () => {
    writeFormat('secret256')
    writePinLength(8)
    expect(localStorage.getItem(FORMAT_KEY)).toBe('secret256')
    expect(localStorage.getItem(PIN_LENGTH_KEY)).toBe('8')
    expect(readFormat()).toBe('secret256')
    expect(readPinLength()).toBe(8)
  })

  it.each(['', 'Standard', 'secret512', '{"x":1}'])('ignores a junk format %j', (value) => {
    localStorage.setItem(FORMAT_KEY, value)
    expect(readFormat()).toBe('standard')
  })

  it.each(['', '5', '6.0x', 'eight', '-4'])('ignores a junk PIN length %j', (value) => {
    localStorage.setItem(PIN_LENGTH_KEY, value)
    expect(readPinLength()).toBe(6)
  })

  it('falls back to defaults when storage throws on read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(readFormat()).toBe('standard')
    expect(readPinLength()).toBe(6)
  })

  it('swallows errors when storage throws on write', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(() => writeFormat('pin')).not.toThrow()
    expect(() => writePinLength(4)).not.toThrow()
  })
})
```

`src/lib/spell.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { spell } from './spell'

describe('spell', () => {
  it('announces case and separators', () => {
    expect(spell('ab-Rc7')).toBe('a, b, dash, capital R, c, 7')
  })

  it('names every Strong symbol', () => {
    expect(spell('!@#$%^&*-_=+?')).toBe(
      'exclamation mark, at, hash, dollar, percent, caret, ampersand, asterisk, dash, underscore, equals, plus, question mark',
    )
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib`
Expected: FAIL — cannot resolve `./clipboard`, `./preferences`, `./spell`.

- [ ] **Step 4: Implement `src/lib/clipboard.ts`**

```ts
export const CLEAR_AFTER_MS = 90_000

let pendingClear: ReturnType<typeof setTimeout> | undefined
let copyVersion = 0

/**
 * Copies a secret and, 90 s later, clears the clipboard only if this tab has focus and the clipboard
 * still holds exactly that secret. Browsers have no clipboard-expiry API, so this is best effort.
 * Rejects if the write fails; in that case nothing is scheduled.
 */
export async function copySecret(secret: string): Promise<void> {
  // Invalidate an older timer/read immediately, even while this write is pending.
  cancelPendingClear()
  const version = copyVersion
  await navigator.clipboard.writeText(secret)
  if (version !== copyVersion) return
  pendingClear = setTimeout(() => {
    pendingClear = undefined
    void clearIfUnchanged(secret, version)
  }, CLEAR_AFTER_MS)
}

export function cancelPendingClear(): void {
  copyVersion++ // Invalidates in-flight reads and writes as well as scheduled timers.
  if (pendingClear !== undefined) clearTimeout(pendingClear)
  pendingClear = undefined
}

async function clearIfUnchanged(secret: string, version: number): Promise<void> {
  if (version !== copyVersion || !document.hasFocus()) return
  try {
    const current = await navigator.clipboard.readText()
    if (version !== copyVersion || !document.hasFocus() || current !== secret) return
    await navigator.clipboard.writeText('')
  } catch {
    // Read refused (e.g. Safari): never clear what we cannot verify.
  }
}
```

Clipboard reads and writes are separate browser operations, not an atomic compare-and-clear.
The guards prevent stale operations controlled by this page from initiating a clear; they cannot
cancel a browser write already issued or eliminate an external clipboard change between read and
write. Keep clearing described as best effort.

- [ ] **Step 5: Implement `src/lib/preferences.ts`**

```ts
import { DEFAULT_FORMAT, DEFAULT_OPTIONS, isFormatId, isPinLength, type FormatId, type PinLength } from '../core/formats'

// Only these two preferences are ever stored. A generated secret is never persisted.
export const FORMAT_KEY = 'pyrgus.format'
export const PIN_LENGTH_KEY = 'pyrgus.pinLength'

export function readFormat(): FormatId {
  const value = read(FORMAT_KEY)
  return isFormatId(value) ? value : DEFAULT_FORMAT
}

export function readPinLength(): PinLength {
  const raw = read(PIN_LENGTH_KEY)
  const value = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null
  return isPinLength(value) ? value : DEFAULT_OPTIONS.pinLength
}

export function writeFormat(id: FormatId): void {
  write(FORMAT_KEY, id)
}

export function writePinLength(n: PinLength): void {
  write(PIN_LENGTH_KEY, String(n))
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null // Storage blocked: behave as if nothing is stored.
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage blocked or full: the preference is simply not remembered.
  }
}
```

- [ ] **Step 6: Implement `src/lib/spell.ts`**

```ts
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
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/lib`
Expected: PASS.

- [ ] **Step 8: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/lib
git commit -m "feat(lib): add guarded clipboard clearing, validated preferences and spoken form"
```

---

### Task 7: State — `src/hooks/usePyrgus.ts`

**Files:**
- Create: `src/hooks/usePyrgus.ts`
- Test: `src/hooks/usePyrgus.test.ts`

**Interfaces:**
- Consumes: `generate` (Task 4); `formatEntropy` (Task 5); `FormatId`, `PinLength` (Task 3); `copySecret`, `cancelPendingClear`, `readFormat`, `readPinLength`, `writeFormat`, `writePinLength`, `FORMAT_KEY`, `PIN_LENGTH_KEY` (Task 6).
- Produces:
  ```ts
  export const COPIED_MS = 2000
  export type Pyrgus = {
    format: FormatId
    pinLength: PinLength
    password: string | null   // null ⇔ error
    error: boolean
    entropy: string           // formatEntropy output, e.g. "90.1"
    copied: boolean
    copyFailed: boolean
    announcement: string      // text for the polite live region
    setFormat(id: FormatId): void
    setPinLength(n: PinLength): void
    regenerate(): void
    copy(): Promise<void>
  }
  export function usePyrgus(): Pyrgus
  ```

- [ ] **Step 1: Write the failing tests**

`src/hooks/usePyrgus.test.ts`:

```ts
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cancelPendingClear } from '../lib/clipboard'
import { FORMAT_KEY, PIN_LENGTH_KEY } from '../lib/preferences'
import { COPIED_MS, usePyrgus } from './usePyrgus'

const writeText = vi.fn(async (_text: string) => {})

beforeEach(() => {
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText: vi.fn(async () => '') },
  })
})

afterEach(() => {
  cancelPendingClear()
  localStorage.clear()
  vi.useRealTimers()
})

describe('usePyrgus', () => {
  it('generates a Standard password on mount', () => {
    const { result } = renderHook(() => usePyrgus())
    expect(result.current.format).toBe('standard')
    expect(result.current.password).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
    expect(result.current.entropy).toBe('90.1')
    expect(result.current.error).toBe(false)
    expect(result.current.announcement).toBe('')
  })

  it('regenerates when the format or PIN length changes, and persists only those two settings', () => {
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat('pin'))
    expect(result.current.password).toMatch(/^\d{6}$/)
    act(() => result.current.setPinLength(8))
    expect(result.current.password).toMatch(/^\d{8}$/)
    expect(result.current.entropy).toBe('26.6')
    expect(result.current.announcement).toBe('New password generated')

    expect(Object.keys(localStorage).sort()).toEqual([FORMAT_KEY, PIN_LENGTH_KEY].sort())
    for (const key of Object.keys(localStorage)) {
      expect(localStorage.getItem(key)).not.toBe(result.current.password)
    }
  })

  it('restores stored settings', () => {
    localStorage.setItem(FORMAT_KEY, 'pin')
    localStorage.setItem(PIN_LENGTH_KEY, '4')
    const { result } = renderHook(() => usePyrgus())
    expect(result.current.pinLength).toBe(4)
    expect(result.current.password).toMatch(/^\d{4}$/)
  })

  it('copies, shows copied for 2 s, then resets', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    const { result } = renderHook(() => usePyrgus())
    const password = result.current.password
    await act(() => result.current.copy())
    expect(writeText).toHaveBeenCalledWith(password)
    expect(result.current.copied).toBe(true)
    expect(result.current.announcement).toBe('Copied')
    act(() => vi.advanceTimersByTime(COPIED_MS - 1))
    expect(result.current.copied).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(result.current.copied).toBe(false)
  })

  it('a new password clears the copied state immediately', async () => {
    const { result } = renderHook(() => usePyrgus())
    await act(() => result.current.copy())
    expect(result.current.copied).toBe(true)
    act(() => result.current.regenerate())
    expect(result.current.copied).toBe(false)
  })

  it.each([
    ['regenerate', 'resolve'], ['regenerate', 'reject'],
    ['format', 'resolve'], ['format', 'reject'],
    ['pin length', 'resolve'], ['pin length', 'reject'],
  ] as const)('ignores a stale copy after %s when its write later %s', async (change, outcome) => {
    let resolveWrite!: () => void
    let rejectWrite!: (reason: Error) => void
    writeText.mockImplementationOnce(() => new Promise<void>((resolve, reject) => {
      resolveWrite = resolve
      rejectWrite = reject
    }))
    const { result } = renderHook(() => usePyrgus())
    act(() => result.current.setFormat('pin'))
    let pendingCopy!: Promise<void>
    act(() => { pendingCopy = result.current.copy() })
    act(() => {
      if (change === 'regenerate') result.current.regenerate()
      else if (change === 'format') result.current.setFormat('secret256')
      else result.current.setPinLength(8)
    })
    const currentPassword = result.current.password
    await act(async () => {
      if (outcome === 'resolve') resolveWrite()
      else rejectWrite(new Error('denied'))
      await pendingCopy
    })
    expect(result.current.password).toBe(currentPassword)
    expect(result.current.copied).toBe(false)
    expect(result.current.copyFailed).toBe(false)
    expect(result.current.announcement).toBe('New password generated')
  })

  it.each(['resolve', 'reject'] as const)(
    'ignores an older copy that later %s after a newer copy succeeds',
    async (outcome) => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      let resolveWrite!: () => void
      let rejectWrite!: (reason: Error) => void
      writeText.mockImplementationOnce(() => new Promise<void>((resolve, reject) => {
        resolveWrite = resolve
        rejectWrite = reject
      }))
      const { result } = renderHook(() => usePyrgus())
      let first!: Promise<void>
      act(() => { first = result.current.copy() })
      await act(() => result.current.copy())
      act(() => vi.advanceTimersByTime(1000))
      await act(async () => {
        if (outcome === 'resolve') resolveWrite()
        else rejectWrite(new Error('denied'))
        await first
      })
      expect(result.current.copied).toBe(true)
      expect(result.current.copyFailed).toBe(false)
      expect(result.current.announcement).toBe('Copied')
      act(() => vi.advanceTimersByTime(COPIED_MS - 1000))
      expect(result.current.copied).toBe(false) // Stale success must not restart the timer.
    },
  )

  it('reports a refused clipboard write without claiming success', async () => {
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    const { result } = renderHook(() => usePyrgus())
    await act(() => result.current.copy())
    expect(result.current.copied).toBe(false)
    expect(result.current.copyFailed).toBe(true)
    expect(result.current.announcement).toBe('Copy failed')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks`
Expected: FAIL — cannot resolve `./usePyrgus`.

- [ ] **Step 3: Implement `src/hooks/usePyrgus.ts`**

Use a ref-backed version to invalidate pending feedback on every new copy and every generation
change. Guard both success and failure after awaiting the clipboard. This version is independent
of Task 6's clear version: regenerating dismisses old feedback but must retain the 90-second clear
for a secret already copied. A newer copy invalidates the previous clear through `copySecret`.

```ts
import { useEffect, useRef, useState } from 'react'
import { formatEntropy } from '../core/entropy'
import type { FormatId, PinLength } from '../core/formats'
import { generate } from '../core/generate'
import { copySecret } from '../lib/clipboard'
import { readFormat, readPinLength, writeFormat, writePinLength } from '../lib/preferences'

export const COPIED_MS = 2000

export type Pyrgus = {
  format: FormatId
  pinLength: PinLength
  /** null means secure randomness is unavailable: the UI shows the error state. */
  password: string | null
  error: boolean
  entropy: string
  copied: boolean
  copyFailed: boolean
  announcement: string
  setFormat(id: FormatId): void
  setPinLength(n: PinLength): void
  regenerate(): void
  copy(): Promise<void>
}

/** Fail closed: any generation error yields no password, never a fallback. */
function tryGenerate(format: FormatId, pinLength: PinLength): string | null {
  try {
    return generate(format, { pinLength })
  } catch {
    return null
  }
}

export function usePyrgus(): Pyrgus {
  const [format, setFormatState] = useState<FormatId>(readFormat)
  const [pinLength, setPinLengthState] = useState<PinLength>(readPinLength)
  const [password, setPassword] = useState<string | null>(() => tryGenerate(format, pinLength))
  // 0 = not copied; each successful copy bumps it, restarting the 2 s timer.
  const [copiedId, setCopiedId] = useState(0)
  const [copyFailed, setCopyFailed] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const feedbackVersion = useRef(0)

  useEffect(() => {
    if (copiedId === 0) return
    const timer = setTimeout(() => setCopiedId(0), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copiedId])

  function next(nextFormat: FormatId, nextPinLength: PinLength) {
    feedbackVersion.current++
    setPassword(tryGenerate(nextFormat, nextPinLength))
    setCopiedId(0)
    setCopyFailed(false)
    setAnnouncement('New password generated')
  }

  function setFormat(id: FormatId) {
    setFormatState(id)
    writeFormat(id)
    next(id, pinLength)
  }

  function setPinLength(n: PinLength) {
    setPinLengthState(n)
    writePinLength(n)
    next(format, n)
  }

  async function copy() {
    if (password === null) return
    const version = ++feedbackVersion.current
    try {
      await copySecret(password)
      if (version !== feedbackVersion.current) return
      setCopyFailed(false)
      setCopiedId((id) => id + 1)
      setAnnouncement('Copied')
    } catch {
      if (version !== feedbackVersion.current) return
      setCopiedId(0)
      setCopyFailed(true)
      setAnnouncement('Copy failed')
    }
  }

  return {
    format,
    pinLength,
    password,
    error: password === null,
    entropy: formatEntropy(format, { pinLength }),
    copied: copiedId !== 0,
    copyFailed,
    announcement,
    setFormat,
    setPinLength,
    regenerate: () => next(format, pinLength),
    copy,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks`
Expected: PASS.

- [ ] **Step 5: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/hooks
git commit -m "feat: add usePyrgus state hook"
```

---

### Task 8: Generator UI — Catalyst, fonts, card

**Files:**
- Create (copied): `src/components/catalyst/{button,dropdown,link,text,badge}.tsx`
- Create: `src/assets/fonts/{inter-latin-wght-normal.woff2,jetbrains-mono-latin-wght-normal.woff2,Inter-OFL.txt,JetBrainsMono-OFL.txt}`, `src/components/icons.tsx`, `src/components/SecretDisplay.tsx`, `src/components/FormatPicker.tsx`, `src/components/PinLengthControl.tsx`, `src/components/GeneratorCard.tsx`
- Modify: `src/index.css`, `src/App.tsx`, `eslint.config.js` (only if Step 2 requires)
- Test: `src/components/GeneratorCard.test.tsx`, `src/components/GeneratorCard.error.test.tsx`

**Interfaces:**
- Consumes: `usePyrgus`, `Pyrgus` (Task 7); `FORMAT_GROUPS`, `FORMAT_LABELS`, `PIN_LENGTHS`, `FormatId`, `PinLength` (Task 3); `spell` (Task 6); `cancelPendingClear`, `FORMAT_KEY`, `PIN_LENGTH_KEY` (Task 6).
- Produces:
  ```tsx
  export function SecretText(props: { value: string }): React.ReactNode       // digit-highlighted spans
  export function SecretDisplay(props: { value: string; onCopy: () => void })  // data-testid="secret"
  export function FormatPicker(props: { value: FormatId; onChange: (id: FormatId) => void })
  export function PinLengthControl(props: { value: PinLength; onChange: (n: PinLength) => void })
  export function GeneratorCard()
  export function ChevronDownIcon(props: React.ComponentPropsWithoutRef<'svg'>)
  export function CheckIcon(props: React.ComponentPropsWithoutRef<'svg'>)
  export function GitHubIcon(props: React.ComponentPropsWithoutRef<'svg'>)
  export const RANDOMNESS_ERROR: string
  ```
  Accessible names used by tests: format button `Format: <label>`; menu items by label; radios `4 digits` / `6 digits` / `8 digits`; buttons `Copy` / `Copied ✓` / `Regenerate`.

- [ ] **Step 1: Copy the Catalyst components**

```bash
mkdir -p src/components/catalyst
cp tmp/catalyst-ui-kit/typescript/{button,dropdown,link,text,badge}.tsx src/components/catalyst/
```

Do not edit these files except as Step 2 requires.

- [ ] **Step 2: Make the copied components pass lint and type-check without editing their logic**

Run: `npm run lint && npx tsc -b`

- If **ESLint** reports errors only inside `src/components/catalyst/`, add this block as the last element of the `defineConfig([...])` array in `eslint.config.js`, listing exactly the rule ids reported (the two shown are the likely ones):

  ```js
  {
    // Copied Tailwind Plus code: keep it pristine; relax only the rules it trips.
    files: ['src/components/catalyst/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  ```

- If **tsc** reports `Cannot find namespace 'React'` in a Catalyst file, add `import type React from 'react'` as that file's first import. That is the only permitted edit.

Expected afterwards: `npm run lint` and `npx tsc -b` succeed.

- [ ] **Step 3: Add the fonts (self-hosted; no CDN)**

The user already unpacked the Fontsource font files into `tmp/fontsource-variable-inter-5.3.0/` and
`tmp/fontsource-variable-jetbrains-mono-5.3.0/` (fonts only, no licence). Copy the two latin variable
fonts, then fetch the OFL licence texts from the same package versions (unpacked into `tmp/` only;
they are not dependencies):

```bash
mkdir -p src/assets/fonts tmp/fonts/inter tmp/fonts/mono
cp tmp/fontsource-variable-inter-5.3.0/inter-latin-wght-normal.woff2 src/assets/fonts/
cp tmp/fontsource-variable-jetbrains-mono-5.3.0/jetbrains-mono-latin-wght-normal.woff2 src/assets/fonts/
npm pack @fontsource-variable/inter@5.3.0 @fontsource-variable/jetbrains-mono@5.3.0 --pack-destination tmp/fonts
tar -xzf tmp/fonts/fontsource-variable-inter-5.3.0.tgz -C tmp/fonts/inter package/LICENSE
tar -xzf tmp/fonts/fontsource-variable-jetbrains-mono-5.3.0.tgz -C tmp/fonts/mono package/LICENSE
cp tmp/fonts/inter/package/LICENSE src/assets/fonts/Inter-OFL.txt
cp tmp/fonts/mono/package/LICENSE src/assets/fonts/JetBrainsMono-OFL.txt
ls src/assets/fonts
grep -c "SIL Open Font License" src/assets/fonts/*-OFL.txt
```

Expected: four files listed, and a non-zero count for each licence file.

Replace `src/index.css`:

```css
@import 'tailwindcss';

@font-face {
  font-family: 'Inter Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 900;
  src: url('./assets/fonts/inter-latin-wght-normal.woff2') format('woff2-variations');
}

@font-face {
  font-family: 'JetBrains Mono Variable';
  font-style: normal;
  font-display: swap;
  font-weight: 100 800;
  src: url('./assets/fonts/jetbrains-mono-latin-wght-normal.woff2') format('woff2-variations');
}

@theme {
  --font-sans: 'Inter Variable', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

- [ ] **Step 4: Write the icons**

`src/components/icons.tsx`:

```tsx
type IconProps = React.ComponentPropsWithoutRef<'svg'>

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon" {...props}>
      <path
        fillRule="evenodd"
        d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" data-slot="icon" {...props}>
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  )
}

export function GitHubIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
```

- [ ] **Step 5: Write the failing component tests**

`src/components/GeneratorCard.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cancelPendingClear } from '../lib/clipboard'
import { FORMAT_KEY, PIN_LENGTH_KEY } from '../lib/preferences'
import { GeneratorCard } from './GeneratorCard'

const writeText = vi.fn(async (_text: string) => {})

/** user-event installs its own clipboard stub in setup(); ours must be defined after it. */
function setup() {
  const user = userEvent.setup()
  writeText.mockClear()
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText, readText: vi.fn(async () => '') },
  })
  render(<GeneratorCard />)
  return user
}

const secret = () => screen.getByTestId('secret').textContent ?? ''

async function chooseFormat(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: /^Format:/ }))
  await user.click(screen.getByRole('menuitem', { name: label }))
}

afterEach(() => {
  cancelPendingClear()
  localStorage.clear()
})

describe('GeneratorCard', () => {
  it('shows a Standard password and its entropy on load', () => {
    setup()
    expect(secret()).toMatch(/^[^-]{6}-[^-]{6}-[^-]{6}$/)
    expect(screen.getByText('90.1 bits of entropy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Format: Standard' })).toBeInTheDocument()
  })

  it('switches format from the menu and remembers it', async () => {
    const user = setup()
    await chooseFormat(user, 'Secret 256')
    expect(secret()).toMatch(/^[0-9a-f]{64}$/)
    expect(screen.getByText('256 bits of entropy')).toBeInTheDocument()
    expect(localStorage.getItem(FORMAT_KEY)).toBe('secret256')
  })

  it('shows the PIN length control only for PIN', async () => {
    const user = setup()
    expect(screen.queryByRole('radiogroup', { name: 'PIN length' })).not.toBeInTheDocument()
    await chooseFormat(user, 'PIN')
    expect(screen.getByRole('radiogroup', { name: 'PIN length' })).toBeInTheDocument()
    expect(secret()).toMatch(/^\d{6}$/)
    await user.click(screen.getByRole('radio', { name: '8 digits' }))
    expect(secret()).toMatch(/^\d{8}$/)
    await chooseFormat(user, 'Standard')
    expect(screen.queryByRole('radiogroup', { name: 'PIN length' })).not.toBeInTheDocument()
  })

  it('restores stored settings', () => {
    localStorage.setItem(FORMAT_KEY, 'pin')
    localStorage.setItem(PIN_LENGTH_KEY, '4')
    setup()
    expect(secret()).toMatch(/^\d{4}$/)
    expect(screen.getByRole('radio', { name: '4 digits' })).toBeChecked()
  })

  it('regenerates', async () => {
    const user = setup()
    const before = secret()
    await user.click(screen.getByRole('button', { name: 'Regenerate' }))
    expect(secret()).not.toBe(before)
  })

  it('copies the displayed value and confirms', async () => {
    const user = setup()
    const shown = secret()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(writeText).toHaveBeenCalledWith(shown)
    expect(screen.getByRole('button', { name: 'Copied ✓' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Copied')
  })

  it('copies when the secret itself is clicked', async () => {
    const user = setup()
    await user.click(screen.getByTestId('secret'))
    expect(writeText).toHaveBeenCalledWith(secret())
  })

  it('never claims success when the clipboard refuses', async () => {
    const user = setup()
    writeText.mockRejectedValueOnce(new DOMException('denied', 'NotAllowedError'))
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    expect(screen.queryByRole('button', { name: 'Copied ✓' })).not.toBeInTheDocument()
    expect(screen.getByText("Couldn't copy. Select the password and copy it manually.")).toBeInTheDocument()
  })

  it('spells the secret for screen readers and hides the visual copy from them', () => {
    setup()
    expect(screen.getByTestId('secret')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText(/^Generated password: /)).toHaveClass('sr-only')
  })
})
```

`src/components/GeneratorCard.error.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GeneratorCard, RANDOMNESS_ERROR } from './GeneratorCard'

vi.mock('../core/generate', () => ({
  generate: () => {
    throw new Error('crypto.getRandomValues is unavailable')
  },
}))

describe('GeneratorCard without secure randomness', () => {
  it('shows the error, no secret, and disables the actions', () => {
    render(<GeneratorCard />)
    expect(screen.getByRole('alert')).toHaveTextContent(RANDOMNESS_ERROR)
    expect(screen.queryByTestId('secret')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Regenerate' })).toBeDisabled()
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run src/components`
Expected: FAIL — cannot resolve `./GeneratorCard`.

- [ ] **Step 7: Implement `src/components/SecretDisplay.tsx`**

```tsx
import { spell } from '../lib/spell'

/** The secret with digit runs highlighted in indigo (all formats, including hex). */
export function SecretText({ value }: { value: string }) {
  return value.split(/(\d+)/).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-indigo-600 dark:text-indigo-400">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

/**
 * Wraps at any character and never truncates: a truncated secret that looks complete is a
 * correctness bug. The visual value is aria-hidden; screen readers get the spelled form instead.
 */
export function SecretDisplay({ value, onCopy }: { value: string; onCopy: () => void }) {
  return (
    <div className="mt-6">
      <p
        data-testid="secret"
        aria-hidden="true"
        title="Click to copy"
        onClick={onCopy}
        className="cursor-pointer font-mono text-2xl/9 font-medium tracking-wide wrap-anywhere text-zinc-950 select-all dark:text-white"
      >
        <SecretText value={value} />
      </p>
      <p className="sr-only">Generated password: {spell(value)}</p>
    </div>
  )
}
```

- [ ] **Step 8: Implement `src/components/FormatPicker.tsx`**

```tsx
import { FORMAT_GROUPS, FORMAT_LABELS, type FormatId } from '../core/formats'
import {
  Dropdown,
  DropdownButton,
  DropdownHeading,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSection,
} from './catalyst/dropdown'
import { CheckIcon, ChevronDownIcon } from './icons'

export function FormatPicker({ value, onChange }: { value: FormatId; onChange: (id: FormatId) => void }) {
  return (
    <Dropdown>
      <DropdownButton outline aria-label={`Format: ${FORMAT_LABELS[value]}`}>
        {FORMAT_LABELS[value]}
        <ChevronDownIcon />
      </DropdownButton>
      <DropdownMenu anchor="bottom start">
        {FORMAT_GROUPS.map((group) => (
          <DropdownSection key={group.heading} aria-label={group.heading}>
            <DropdownHeading>{group.heading}</DropdownHeading>
            {group.ids.map((id) => (
              <DropdownItem key={id} onClick={() => onChange(id)}>
                {id === value ? <CheckIcon /> : null}
                <DropdownLabel>{FORMAT_LABELS[id]}</DropdownLabel>
              </DropdownItem>
            ))}
          </DropdownSection>
        ))}
      </DropdownMenu>
    </Dropdown>
  )
}
```

- [ ] **Step 9: Implement `src/components/PinLengthControl.tsx`**

```tsx
import { Radio, RadioGroup } from '@headlessui/react'
import { PIN_LENGTHS, type PinLength } from '../core/formats'

export function PinLengthControl({ value, onChange }: { value: PinLength; onChange: (n: PinLength) => void }) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      aria-label="PIN length"
      className="inline-flex rounded-lg bg-zinc-950/5 p-0.5 dark:bg-white/5"
    >
      {PIN_LENGTHS.map((n) => (
        <Radio
          key={n}
          value={n}
          aria-label={`${n} digits`}
          className="cursor-default rounded-md px-3 py-1 text-sm/6 font-medium text-zinc-600 data-checked:bg-white data-checked:text-zinc-950 data-checked:shadow-sm data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-blue-500 dark:text-zinc-400 dark:data-checked:bg-zinc-700 dark:data-checked:text-white"
        >
          {n}
        </Radio>
      ))}
    </RadioGroup>
  )
}
```

- [ ] **Step 10: Implement `src/components/GeneratorCard.tsx`**

```tsx
import { usePyrgus } from '../hooks/usePyrgus'
import { Button } from './catalyst/button'
import { FormatPicker } from './FormatPicker'
import { PinLengthControl } from './PinLengthControl'
import { SecretDisplay } from './SecretDisplay'

export const RANDOMNESS_ERROR = "Your browser can't provide secure randomness, so Pyrgus won't generate a password."

export function GeneratorCard() {
  const p = usePyrgus()

  return (
    <section aria-labelledby="generator-heading" className="mx-auto w-full max-w-md px-4">
      <h1 id="generator-heading" className="sr-only">
        Pyrgus password generator
      </h1>
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-zinc-950/5 dark:bg-zinc-900 dark:ring-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FormatPicker value={p.format} onChange={p.setFormat} />
          {p.format === 'pin' ? <PinLengthControl value={p.pinLength} onChange={p.setPinLength} /> : null}
        </div>

        {p.password === null ? (
          <p role="alert" className="mt-6 text-sm/6 font-medium text-red-600 dark:text-red-400">
            {RANDOMNESS_ERROR}
          </p>
        ) : (
          <>
            <SecretDisplay value={p.password} onCopy={() => void p.copy()} />
            <p className="mt-2 text-sm/6 text-zinc-500 dark:text-zinc-400">{p.entropy} bits of entropy</p>
          </>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button color="indigo" disabled={p.error} onClick={() => void p.copy()}>
            {p.copied ? 'Copied ✓' : 'Copy'}
          </Button>
          <Button outline disabled={p.error} onClick={p.regenerate}>
            Regenerate
          </Button>
        </div>

        <p className="mt-3 text-xs/5 text-zinc-500 dark:text-zinc-400">
          {p.copyFailed
            ? "Couldn't copy. Select the password and copy it manually."
            : 'Clipboard clears in 90s while this tab is open.'}
        </p>
        <p role="status" className="sr-only">
          {p.announcement}
        </p>
      </div>

      <div className="mt-6 text-center">
        <a
          href="#apps"
          className="inline-flex rounded-full px-4 py-1.5 text-sm/6 font-medium text-indigo-700 ring-1 ring-indigo-600/20 hover:bg-indigo-50 dark:text-indigo-300 dark:ring-indigo-400/30 dark:hover:bg-indigo-500/10"
        >
          Pyrgus for iPhone, iPad &amp; Mac — coming soon ↓
        </a>
      </div>
    </section>
  )
}
```

- [ ] **Step 11: Wire it into `src/App.tsx`**

```tsx
import { GeneratorCard } from './components/GeneratorCard'

export default function App() {
  return (
    <main className="py-12">
      <GeneratorCard />
    </main>
  )
}
```

- [ ] **Step 12: Run tests to verify they pass**

Run: `npx vitest run src/components`
Expected: PASS. If Headless UI throws about a missing browser API in jsdom, add a no-op shim for that API to the `if (typeof window !== 'undefined')` block in `test-support/setup.ts`, following the existing pattern; do not change component code to satisfy jsdom.

- [ ] **Step 13: Full check, visual check, commit**

```bash
npm run format && npm run lint && npm run build && npm test
npm run dev
```

Open the printed URL. Check in light and dark mode (toggle the OS appearance): the card renders, the dropdown shows **Passwords** / **Secrets** headings, PIN shows the 4·6·8 control, digits are indigo, Copy flips to "Copied ✓". Stop the server.

```bash
git add src eslint.config.js test-support
git commit -m "feat(ui): add generator card with format picker, PIN length and copy"
```

---

### Task 9: Page shell, apps section, metadata and icons

**Files:**
- Create: `src/config.ts`, `src/components/Logo.tsx`, `src/components/Header.tsx`, `src/components/Footer.tsx`, `src/components/PhoneMockup.tsx` (from Pocket), `src/assets/phone-frame.svg` (from Pocket), `src/components/WidgetMockup.tsx`, `src/components/AppsSection.tsx`, `public/favicon.svg` (replace), `public/404.html`, `public/404.css`, `design/og.html`, `design/apple-touch-icon.html`, `public/og.png`, `public/apple-touch-icon.png`
- Modify: `index.html`, `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `GeneratorCard` (Task 8); `SecretText` (Task 8); `Badge` from `catalyst/badge`, `TextLink` from `catalyst/text`; `GitHubIcon` (Task 8).
- Produces: `REPO_URL`, `EFF_WORDLIST_URL` in `src/config.ts`; `Logo`, `Header`, `Footer`, `PhoneFrame`, `PhoneMockup`, `WidgetMockup`, `AppsSection` components; `SAMPLE_SECRET = 'khduvn-xeRvpr-mzt7ai'` exported from `PhoneMockup.tsx`.

- [ ] **Step 1: Write the failing page test**

`src/App.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { SAMPLE_SECRET } from './components/PhoneMockup'
import { EFF_WORDLIST_URL, REPO_URL } from './config'

describe('App', () => {
  it('renders the generator, the apps section and the footer', () => {
    render(<App />)
    expect(screen.getByTestId('secret')).toBeInTheDocument()

    const apps = screen.getByRole('region', { name: 'Pyrgus is coming to iPhone, iPad & Mac' })
    expect(apps).toHaveAttribute('id', 'apps')
    expect(within(apps).getByText('On-device. No account, no net.')).toBeInTheDocument()
    expect(within(apps).getByText('Coming soon · iPhone · iPad · Mac')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Pyrgus for iPhone, iPad & Mac — coming soon ↓' })).toHaveAttribute(
      'href',
      '#apps',
    )
    expect(screen.getByRole('link', { name: 'Source code on GitHub' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', REPO_URL)
    expect(screen.getByRole('link', { name: 'EFF long wordlist' })).toHaveAttribute('href', EFF_WORDLIST_URL)
    expect(screen.getByText('Passwords are generated in your browser and never leave it.')).toBeInTheDocument()
  })

  it('never shows a real generated value in the phone mockup', () => {
    const { container } = render(<App />)
    const phone = container.querySelector('[data-mockup="phone"]')
    expect(phone).toHaveAttribute('aria-hidden', 'true')
    expect(phone?.textContent).toContain(SAMPLE_SECRET)
    expect(phone?.textContent).not.toContain(screen.getByTestId('secret').textContent)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — cannot resolve `./components/PhoneMockup` / `./config`.

- [ ] **Step 3: Write `src/config.ts` and `src/components/Logo.tsx`**

`src/config.ts`:

```ts
export const REPO_URL = 'https://github.com/mssio/pyrgus-web'
export const EFF_WORDLIST_URL = 'https://www.eff.org/dice'
```

`src/components/Logo.tsx` (placeholder butterfly mark; replaceable by the final icon):

```tsx
export function Logo(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <g className="fill-indigo-600 dark:fill-indigo-400">
        <path d="M15 15C12 7 5 3 3 6s1 9 12 10Z" />
        <path d="M17 15c3-8 10-12 12-9s-1 9-12 10Z" />
        <path d="M15 17c-8 1-11 5-9 8s7 0 9-7Z" />
        <path d="M17 17c8 1 11 5 9 8s-7 0-9-7Z" />
      </g>
      <rect x="15" y="9" width="2" height="16" rx="1" className="fill-zinc-900 dark:fill-white" />
    </svg>
  )
}
```

- [ ] **Step 4: Write `src/components/Header.tsx` and `src/components/Footer.tsx`**

`src/components/Header.tsx`:

```tsx
import { REPO_URL } from '../config'
import { GitHubIcon } from './icons'
import { Logo } from './Logo'

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6 sm:px-6">
      <a href="/" className="flex items-center gap-2 text-zinc-950 dark:text-white">
        <Logo className="size-8" />
        <span className="text-lg font-semibold tracking-tight">Pyrgus</span>
      </a>
      <a
        href={REPO_URL}
        aria-label="Source code on GitHub"
        className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
      >
        <GitHubIcon className="size-6" />
      </a>
    </header>
  )
}
```

`src/components/Footer.tsx`:

```tsx
import { EFF_WORDLIST_URL, REPO_URL } from '../config'
import { TextLink } from './catalyst/text'

export function Footer() {
  return (
    <footer className="border-t border-zinc-950/5 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-10 text-sm/6 text-zinc-500 sm:px-6 dark:text-zinc-400">
        <p>Passwords are generated in your browser and never leave it.</p>
        <p>
          Memorable passwords use the <TextLink href={EFF_WORDLIST_URL}>EFF long wordlist</TextLink> (CC BY 3.0 US).
        </p>
        <p>
          © 2026 mss.io · <TextLink href={REPO_URL}>Source code</TextLink>
        </p>
      </div>
    </footer>
  )
}
```

- [ ] **Step 5: Port Pocket's phone frame**

```bash
cp tmp/tailwind-plus-pocket/pocket-ts/src/images/phone-frame.svg src/assets/phone-frame.svg
cp tmp/tailwind-plus-pocket/pocket-ts/src/components/PhoneFrame.tsx src/components/PhoneMockup.tsx
```

Edit `src/components/PhoneMockup.tsx` — these edits only; keep the rest of Pocket's markup as is:

1. Delete the line `import Image from 'next/image'`.
2. Replace `import frame from '@/images/phone-frame.svg'` with `import frame from '../assets/phone-frame.svg'`.
3. In `PhoneFrame`'s parameter list delete `priority = false,` and change the props type from `React.ComponentPropsWithoutRef<'div'> & { priority?: boolean }` to `React.ComponentPropsWithoutRef<'div'>`.
4. Replace the whole `<Image … />` element with:

   ```tsx
   <img src={frame} alt="" className="pointer-events-none absolute inset-0 h-full w-full dark:brightness-75" />
   ```

5. If the file has no `React` import and tsc complains, add `import type React from 'react'` as the first import.
6. Append the Pyrgus-specific screen at the end of the file:

```tsx
/** A fixed sample, never a real generated value. */
export const SAMPLE_SECRET = 'khduvn-xeRvpr-mzt7ai'

export function PhoneMockup({ className }: { className?: string }) {
  return (
    <PhoneFrame className={className} data-mockup="phone" aria-hidden="true">
      <div className="flex flex-col gap-4 px-5 pt-8 text-white">
        <div className="text-xs font-medium text-zinc-400">Standard</div>
        {/* On the always-dark phone screen, force the dark-mode digit colour. */}
        <div className="font-mono text-xl/8 font-medium wrap-anywhere [&_span]:text-indigo-400">
          <SecretText value={SAMPLE_SECRET} />
        </div>
        <div className="text-xs text-zinc-400">90.1 bits of entropy</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-sm font-semibold">
          <div className="rounded-lg bg-indigo-500 py-2">Copy</div>
          <div className="rounded-lg bg-white/10 py-2">Regenerate</div>
        </div>
      </div>
    </PhoneFrame>
  )
}
```

and add `import { SecretText } from './SecretDisplay'` to the imports.

- [ ] **Step 6: Write `src/components/WidgetMockup.tsx` and `src/components/AppsSection.tsx`**

`src/components/WidgetMockup.tsx`:

```tsx
import clsx from 'clsx'

/** The Home Screen widget never displays a secret: only a mask of its shape and "Copied". */
export function WidgetMockup({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'w-44 rounded-3xl bg-white/90 p-4 shadow-xl ring-1 ring-zinc-950/10 backdrop-blur dark:bg-zinc-800/90 dark:ring-white/10',
        className,
      )}
    >
      <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Pyrgus</div>
      <div className="mt-3 font-mono text-sm tracking-tight text-zinc-900 dark:text-white">••••••-••••••-••••••</div>
      <div className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Copied ✓</div>
    </div>
  )
}
```

`src/components/AppsSection.tsx`:

```tsx
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
    <section id="apps" aria-labelledby="apps-heading" className="mx-auto mt-24 max-w-5xl scroll-mt-8 px-4 pb-24 sm:px-6">
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
```

- [ ] **Step 7: Compose the page in `src/App.tsx`**

```tsx
import { AppsSection } from './components/AppsSection'
import { Footer } from './components/Footer'
import { GeneratorCard } from './components/GeneratorCard'
import { Header } from './components/Header'

export default function App() {
  return (
    <div className="flex min-h-full flex-col">
      <Header />
      <main className="flex-1 pt-6 sm:pt-12">
        <GeneratorCard />
        <AppsSection />
      </main>
      <Footer />
    </div>
  )
}
```

- [ ] **Step 8: Run the page test**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS.

- [ ] **Step 9: Replace `index.html`**

```html
<!doctype html>
<html lang="en" class="h-full bg-zinc-50 antialiased motion-safe:scroll-smooth dark:bg-zinc-950">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pyrgus: Password Generator</title>
    <meta
      name="description"
      content="Strong passwords and secret keys, generated in your browser. No account, no network."
    />
    <meta name="color-scheme" content="light dark" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://p.mss.io/" />
    <meta property="og:title" content="Pyrgus: Password Generator" />
    <meta
      property="og:description"
      content="Strong passwords and secret keys, generated in your browser. No account, no network."
    />
    <meta property="og:image" content="https://p.mss.io/og.png" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body class="h-full">
    <noscript>
      <p class="p-6 text-center text-sm text-zinc-700 dark:text-zinc-300">
        Pyrgus needs JavaScript to generate passwords in your browser. Nothing is ever sent anywhere.
      </p>
    </noscript>
    <div id="root" class="h-full"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Write the favicon and 404 page**

`public/favicon.svg` (fill attributes only, no `<style>`: the CSP applies to SVG documents too):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <g fill="#4f46e5">
    <path d="M15 15C12 7 5 3 3 6s1 9 12 10Z"/>
    <path d="M17 15c3-8 10-12 12-9s-1 9-12 10Z"/>
    <path d="M15 17c-8 1-11 5-9 8s7 0 9-7Z"/>
    <path d="M17 17c8 1 11 5 9 8s-7 0-9-7Z"/>
  </g>
  <rect x="15" y="9" width="2" height="16" rx="1" fill="#18181b"/>
</svg>
```

`public/404.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Not found · Pyrgus</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="stylesheet" href="/404.css" />
  </head>
  <body>
    <main>
      <h1>Page not found</h1>
      <p><a href="/">Generate a password</a></p>
    </main>
  </body>
</html>
```

`public/404.css`:

```css
:root {
  color-scheme: light dark;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
main {
  max-width: 28rem;
  margin: 20vh auto;
  padding: 0 1rem;
  text-align: center;
}
a {
  color: #4f46e5;
}
```

- [ ] **Step 11: Render the OG image and Apple touch icon**

`design/og.html`:

```html
<!doctype html>
<html>
  <body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;justify-content:center;background:#09090b;font-family:system-ui,sans-serif;color:#fff">
    <div style="text-align:center">
      <img src="../public/favicon.svg" width="140" height="140" alt="" />
      <div style="font-size:88px;font-weight:700;letter-spacing:-2px;margin-top:16px">Pyrgus</div>
      <div style="font-size:36px;color:#a1a1aa;margin-top:8px">Passwords generated in your browser. No account, no network.</div>
      <div style="font-family:ui-monospace,Menlo,monospace;font-size:44px;margin-top:40px">khduvn-xeRvpr-mzt<span style="color:#818cf8">7</span>ai</div>
    </div>
  </body>
</html>
```

`design/apple-touch-icon.html`:

```html
<!doctype html>
<html>
  <body style="margin:0;width:180px;height:180px;display:flex;align-items:center;justify-content:center;background:#ffffff">
    <img src="../public/favicon.svg" width="140" height="140" alt="" />
  </body>
</html>
```

(These design sources are rendered locally and never served, so inline styles are fine here.)

```bash
npx playwright install chromium
npx playwright screenshot --viewport-size="1200, 630" "file://$PWD/design/og.html" public/og.png
npx playwright screenshot --viewport-size="180, 180" "file://$PWD/design/apple-touch-icon.html" public/apple-touch-icon.png
```

Open both PNGs and confirm they look right.

- [ ] **Step 12: Update the LICENSE exclusion if needed, then full check and commit**

`LICENSE` already lists `src/components/PhoneMockup.tsx` and `src/assets/phone-frame.svg`. Confirm no other file came from Tailwind Plus.

```bash
npm run format && npm run lint && npm run build && npm test
npm run dev
```

Check the whole page at 320 px, 768 px and desktop widths, light and dark: header, card, pill scrolls to the apps section, phone and widget mockups, footer links. Stop the server.

```bash
git add index.html public design src
git commit -m "feat(ui): add page shell, apps section, metadata, icons and 404"
```

---

### Task 10: Security headers and real-browser verification

**Files:**
- Create: `vercel.json`, `src/security-headers.test.ts`, `playwright.config.ts`, `tsconfig.e2e.json`, `e2e/smoke.spec.ts`, `e2e/build-output.spec.ts`
- Modify: `vite.config.ts`, `tsconfig.json`

**Interfaces:**
- Consumes: the built site; `data-testid="secret"`; button names `Format: …`, `Copy`, `Copied ✓`; menu item `Secret 256`.
- Produces: `vercel.json` (single source of truth for headers and the `/generate` redirect); `npm run preview` sends the production headers.

- [ ] **Step 1: Write the failing header-config test**

`src/security-headers.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import vercel from '../vercel.json'

const EXPECTED_CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self'",
  "manifest-src 'self'",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
]

const EXPECTED_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy':
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(self), clipboard-write=(self)',
}

describe('vercel.json', () => {
  const rule = vercel.headers.find((r) => r.source === '/(.*)')
  const headers = Object.fromEntries((rule?.headers ?? []).map((h) => [h.key, h.value]))

  it('applies the security headers to every path', () => {
    expect(rule).toBeDefined()
    expect(vercel.headers).toHaveLength(1)
  })

  it('sends exactly the specified CSP, no more and no less', () => {
    const directives = headers['Content-Security-Policy'].split(';').map((d: string) => d.trim())
    expect(directives.sort()).toEqual([...EXPECTED_CSP].sort())
  })

  it.each(Object.entries(EXPECTED_HEADERS))('sends %s', (key, value) => {
    expect(headers[key]).toBe(value)
  })

  it('sends nothing unexpected', () => {
    expect(Object.keys(headers).sort()).toEqual(['Content-Security-Policy', ...Object.keys(EXPECTED_HEADERS)].sort())
  })

  it('permanently redirects /generate to /', () => {
    expect(vercel.redirects).toEqual([{ source: '/generate', destination: '/', permanent: true }])
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/security-headers.test.ts`
Expected: FAIL — cannot resolve `../vercel.json`.

- [ ] **Step 3: Write `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "redirects": [{ "source": "/generate", "destination": "/", "permanent": true }],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; manifest-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; require-trusted-types-for 'script'"
        },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "no-referrer" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Resource-Policy", "value": "same-origin" },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), clipboard-read=(self), clipboard-write=(self)"
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/security-headers.test.ts`
Expected: PASS.

- [ ] **Step 5: Make `vite preview` send the same headers**

In `vite.config.ts`, add below the imports:

```ts
import { readFileSync } from 'node:fs'

type VercelConfig = { headers: { source: string; headers: { key: string; value: string }[] }[] }

// vite preview (and therefore Playwright) sends exactly the production headers.
// The dev server does not: Vite's HMR and React Refresh inject inline scripts the CSP would block.
const vercel = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as VercelConfig
const securityHeaders = Object.fromEntries(vercel.headers.flatMap((rule) => rule.headers).map((h) => [h.key, h.value]))
```

and add `preview: { headers: securityHeaders },` to the object passed to `defineConfig`, after `build`.

- [ ] **Step 6: Add Playwright config and its tsconfig**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  // Chromium enforces Trusted Types, so it is the browser that proves the CSP holds.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
```

`tsconfig.e2e.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.e2e.tsbuildinfo",
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "types": ["node"],
    "skipLibCheck": true,
    "module": "nodenext",
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "erasableSyntaxOnly": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["e2e", "playwright.config.ts"]
}
```

In `tsconfig.json`, add `{ "path": "./tsconfig.e2e.json" }` to `references`.

- [ ] **Step 7: Write the Playwright specs**

`e2e/smoke.spec.ts`:

```ts
import { expect, test, type Page } from '@playwright/test'

type ViolationWindow = Window & { __violations: string[] }

test.beforeEach(async ({ page }) => {
  // Injected over the DevTools protocol, so the page's CSP does not apply to it.
  await page.addInitScript(() => {
    const w = window as unknown as ViolationWindow
    w.__violations = []
    window.addEventListener('securitypolicyviolation', (e) => {
      w.__violations.push(`${e.violatedDirective} ${e.blockedURI}`)
    })
  })
})

const violations = (page: Page) => page.evaluate(() => (window as unknown as ViolationWindow).__violations)

async function chooseFormat(page: Page, label: string) {
  await page.getByRole('button', { name: /^Format:/ }).click()
  await page.getByRole('menuitem', { name: label }).click()
}

test('generates and copies with zero CSP or Trusted Types violations', async ({ page, context }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])

  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("require-trusted-types-for 'script'")

  const secret = page.getByTestId('secret')
  await expect(secret).toHaveText(/^[^-]{6}-[^-]{6}-[^-]{6}$/)

  await chooseFormat(page, 'Secret 256')
  await expect(secret).toHaveText(/^[0-9a-f]{64}$/)

  await page.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(await secret.textContent())

  expect(await violations(page)).toEqual([])
  expect(errors).toEqual([])
})

test('Secret 256 wraps without overflow or truncation at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/')
  await chooseFormat(page, 'Secret 256')

  const secret = page.getByTestId('secret')
  await expect(secret).toHaveText(/^[0-9a-f]{64}$/)
  const m = await secret.evaluate((el) => ({
    scrollWidth: el.scrollWidth,
    clientWidth: el.clientWidth,
    height: el.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(el).lineHeight),
    docWidth: document.documentElement.scrollWidth,
  }))
  expect(m.scrollWidth).toBeLessThanOrEqual(m.clientWidth)
  expect(m.docWidth).toBeLessThanOrEqual(320)
  expect(m.height).toBeGreaterThanOrEqual(2 * m.lineHeight) // wrapped, not clipped to one line
  expect(await violations(page)).toEqual([])
})
```

`e2e/build-output.spec.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

// Playwright's webServer runs `npm run build` first, so dist/ is always fresh here.
const DIST = 'dist'

const files = (dir: string) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((d) => d.isFile())
    .map((d) => join(d.parentPath, d.name))

test('index.html has no inline scripts and no style attributes', () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8')
  const scriptTags = html.match(/<script\b[^>]*>/g) ?? []
  expect(scriptTags.length).toBeGreaterThan(0)
  for (const tag of scriptTags) expect(tag).toMatch(/\bsrc="/)
  expect(html).not.toMatch(/\sstyle="/)
})

test('no built file references a data: URI', () => {
  for (const file of files(DIST).filter((f) => /\.(html|css|js)$/.test(f))) {
    const text = readFileSync(file, 'utf8')
    expect(text, file).not.toMatch(/url\(\s*["']?data:/)
    expect(text, file).not.toMatch(/(src|href)="data:/)
  }
})
```

- [ ] **Step 8: Run the end-to-end suite**

Run: `npm run test:e2e`
Expected: 4 passed. If a CSP or Trusted Types violation is reported, fix the offending code (see AGENTS.md); never edit the CSP.

- [ ] **Step 9: Full check and commit**

```bash
npm run format && npm run lint && npm run build && npm test && npm run test:e2e
git add vercel.json vite.config.ts tsconfig.json tsconfig.e2e.json playwright.config.ts e2e src/security-headers.test.ts
git commit -m "feat: add strict security headers with preview parity and Playwright checks"
```

---

### Task 11: Continuous integration

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/dependabot.yml`

**Interfaces:**
- Consumes: npm scripts from Task 1; `.nvmrc`.
- Produces: a required-able `ci` check on pull requests and `main`.

- [ ] **Step 1: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 2: Write `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    ignore:
      # Held majors; see Global Constraints in docs/2026-09-26-pyrgus-web-plan.md.
      - dependency-name: typescript
        update-types: ['version-update:semver-major']
      - dependency-name: '@babel/core'
        update-types: ['version-update:semver-major']
      - dependency-name: '@types/node'
        update-types: ['version-update:semver-major']
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 3: Simulate CI locally from a clean install**

```bash
rm -rf node_modules dist && npm ci && npm run lint && npm run build && npm test && npm run test:e2e
```

Expected: every command succeeds from a clean install.

- [ ] **Step 4: Commit**

```bash
git add .github
git commit -m "ci: run lint, build, unit and end-to-end tests; enable Dependabot"
```

---

### Task 12: README and final verification

**Files:**
- Modify: `README.md` (replace entirely), `docs/2026-09-26-pyrgus-web-spec.md` (only if implementation diverged)

**Interfaces:**
- Consumes: everything above. Every claim in the README must point at code or config that exists.
- Produces: the human-facing README.

- [ ] **Step 1: Replace `README.md`**

````markdown
# Pyrgus

Strong passwords and secret keys, generated in your browser. **https://p.mss.io**

## How it keeps your secret safe

Every claim below points at the code or config that makes it true.

- **Generated in your browser** with `crypto.getRandomValues`, the operating system's secure random
  source. See [`src/core/random.ts`](src/core/random.ts).
- **Unbiased.** Characters are chosen by rejection sampling, never `x % n`, and required characters
  go to uniformly chosen positions. The chi-squared tests in [`src/core`](src/core) check this.
- **Fails closed.** If secure randomness is unavailable, no password is shown.
- **The page cannot make network requests.** `connect-src 'none'` in [`vercel.json`](vercel.json),
  alongside a strict CSP with Trusted Types.
- **No analytics, no third-party scripts, no CDN fonts.**
- **Nothing stored but your format preference.** Only `pyrgus.format` and `pyrgus.pinLength` go to
  `localStorage`; see [`src/lib/preferences.ts`](src/lib/preferences.ts).

**Limitations.** Clearing the clipboard after 90 s depends on the browser: it happens only while the
tab is open and focused, and only where the browser lets the page read the clipboard (Safari does
not). JavaScript strings cannot be wiped from memory. A compromised browser, operating system or
extension is out of scope.

## Formats

| Format | Example | Entropy |
|---|---|---|
| Standard | `khduvn-xeRvpr-mzt7ai` | 90.1 bits |
| Strong | `k7$Rm2xPq!vLz9Wn#tBc4eYh` | ~149 bits |
| Memorable | `vivid-cobra-mango-42` | 58.3 bits |
| PIN (4 / 6 / 8) | `478210` | 13.3 / 19.9 / 26.6 bits |
| Secret 128 | 32 hex characters | 128 bits |
| Secret 256 | 64 hex characters | 256 bits |

Standard never uses the look-alike characters `l`, `O`, `I`, `0` or `1`.

## Development

Requires Node 24 (see `.nvmrc`).

```sh
npm ci
npm run dev        # dev server; the CSP is NOT applied here (HMR needs inline scripts)
npm run build      # type-check and build to dist/
npm run preview    # serve dist/ with the production security headers
npm run lint
npm run format
```

Rules for contributors and coding agents are in [`AGENTS.md`](AGENTS.md); the design is in
[`docs/2026-09-26-pyrgus-web-spec.md`](docs/2026-09-26-pyrgus-web-spec.md).

## Testing

```sh
npm test           # Vitest: generator shape, exclusions, uniformity, entropy, wordlist, UI
npm run test:e2e   # Playwright on the production build: zero CSP violations, 320 px layout
```

## Deployment

Vercel builds pull requests as previews and `main` as production. Security headers and the
`/generate` → `/` redirect live in [`vercel.json`](vercel.json).

## Pyrgus for iPhone, iPad & Mac

Coming soon.

## Credits and licences

- This project's code is [MIT](LICENSE)-licensed, **except** files derived from Tailwind Plus
  (`src/components/catalyst/`, `src/components/PhoneMockup.tsx`, `src/assets/phone-frame.svg`),
  which are under the [Tailwind Plus licence](https://tailwindcss.com/plus/license). See `LICENSE`.
- Memorable passwords use the [EFF long wordlist](https://www.eff.org/dice) (CC BY 3.0 US).
- [Inter](https://rsms.me/inter/) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/) are
  under the SIL Open Font License 1.1 (see `src/assets/fonts/`).
````

- [ ] **Step 2: Verify every README claim against the repo**

```bash
ls src/core/random.ts src/lib/preferences.ts vercel.json AGENTS.md LICENSE src/assets/fonts/*OFL.txt
grep -q "connect-src 'none'" vercel.json && echo ok-csp
grep -rn "Math.random" src || echo ok-no-math-random
```

Expected: all files listed, `ok-csp`, `ok-no-math-random`.

- [ ] **Step 3: Reconcile the spec**

Compare the built project to `docs/2026-09-26-pyrgus-web-spec.md` (project structure, file names, copy strings, headers). If anything diverged during implementation, update the spec to match what was built and why. If nothing diverged, make no change.

- [ ] **Step 4: Final verification from a clean install**

```bash
rm -rf node_modules dist
npm ci && npm run lint && npm run build && npm test && npm run test:e2e
git status --short   # tmp/ must not appear
```

Expected: all green; nothing under `tmp/` tracked.

- [ ] **Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs: write README"
```

---

## After the plan (performed by the user)

These need accounts and are outside an agent's scope:

1. Create the public GitHub repo `mssio/pyrgus-web`, push `main`, and make the `ci` check required.
2. Create a Vercel project from the repo (framework: Vite; output `dist`). Confirm previews build.
3. On the Vercel URL, run the manual launch checks: securityheaders.com A+, Mozilla Observatory A+,
   Lighthouse 100 for Accessibility and Best Practices, a VoiceOver read-through of a Standard
   password, clipboard clearing in Safari/Chrome/Firefox (Safari is expected not to clear), an unknown
   path shows the 404 page with headers, and `/generate` returns 308 to `/`.
4. Move `p.mss.io` from the 2.0 Vercel project to this one; re-check `/generate`.
5. Archive the 2.0 Vercel project.
6. Native parity: the four hyphenated EFF words (`drop-down`, `felt-tip`, `t-shirt`, `yo-yo`) and the
   `src/core/test-vectors.json` values should be mirrored in the native app's tests.
