# AGENTS.md — rules for coding agents (Pyrgus Web)

This repo sits in the Pyrgus workspace (`..`). The workspace `AGENTS.md` holds the shared rules:
one project per task, git workflow, specs and plans, downloads and installs. This file holds the
rules for this repo's code.

## What this is

Pyrgus Web: a static, browser-only password and secret-key generator served at https://p.mss.io.
Secrets are generated in the browser with `crypto.getRandomValues`; the page cannot make network
requests. The spec at `../docs/web/2026-09-26-pyrgus-web-spec.md` (outside this repo) is the source
of truth. A change to the design updates the spec in a paired commit; larger changes come as dated
change specs that amend it (see the workspace `AGENTS.md`).

## Commands

- `npm ci` — install exactly what the lockfile says
- `npm run dev` — dev server (no CSP; see below)
- `npm run build` — type-check (`tsc -b`) and build to `dist/`
- `npm run preview` — serve `dist/` **with the production security headers**
- `npm run lint` / `npm run format`
- `npm test` — Vitest (unit + component)
- `npm run test:e2e` — Playwright against `preview`

Before claiming any task done: `lint`, `build`, `test` and `test:e2e` all pass.

## Layout

- `src/core/` — framework-free generator (randomness, formats, wordlist, entropy)
- `src/lib/` — browser helpers (clipboard, preferences, spoken form)
- `src/hooks/usePyrgus.ts` — all UI state
- `src/components/` — presentational components; `src/components/catalyst/` is copied Tailwind Plus code
- `test-support/` — test-only helpers (seeded RNG, chi-squared, Vitest setup)
- `e2e/` — Playwright specs
- `../docs/web/` — specs and plans (workspace repo, not this one)
- `../tmp/web/` — downloads placed there by the user; never commit

## Git workflow

- Never commit to `main`. Cut a feature branch (`feat/…`, `fix/…`, `chore/…`, `docs/…`) from an
  up-to-date `origin/main`.
- Finish every task by pushing the branch and opening a **draft** PR with `gh pr create --draft`.
  The user marks it ready and merges (squash).
- Spec and plan edits are committed in the workspace repo, paired with the code commits here.

## Security rules (non-negotiable)

- All randomness goes through `src/core/random.ts`. Never `Math.random` (lint enforces it); never
  `x % n` without rejection sampling. _A biased or predictable password is a silent failure._
- No network access: no `fetch`, XHR, third-party scripts, fonts, analytics or CDNs. _The promise is
  that the secret never leaves the device._
- Never loosen `vercel.json` headers or the CSP to make something work; fix the code.
  `src/security-headers.test.ts` guards this.
- No `dangerouslySetInnerHTML`, inline scripts, `style="…"` attributes in HTML, or `data:` URIs.
  _Trusted Types and the CSP block them in production._
- Never persist, log or `console.*` a generated secret. Only `pyrgus.format` and `pyrgus.pinLength`
  go to `localStorage`.
- Fail closed: on a randomness error show the error state, never a fallback value.

## Dependencies

- Exact versions only (`.npmrc` has `save-exact=true`).
- Held majors: `typescript` 6.x (typescript-eslint needs `<6.1.0`), `@babel/core` 7.x (React Compiler),
  `@types/node` 24.x (matches Node 24). Dependabot ignores their major bumps.
- Runtime dependencies are `react`, `react-dom`, `@headlessui/react`, `clsx`. Ask before adding any
  other runtime dependency.

## Downloads and installs

Follow the workspace `AGENTS.md`: agents never download files or install, update or uninstall
packages; they ask the user. Files go to `../tmp/web/`. `npm ci` is allowed.

## Tailwind Plus

- The Catalyst and Pocket downloads live in `../tmp/web/`, outside this repo. Never commit them,
  never copy them wholesale, never paste their source into docs.
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
the wordlist means updating the vectors **and** telling the user `pyrgus-app` needs the same change.
That change is a separate task; never edit `pyrgus-app` while working here.

## Scope

Change code only inside this repository; docs go in `../docs/web/`.
