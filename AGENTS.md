# AGENTS.md — rules for coding agents

## What this is

Pyrgus Web: a static, browser-only password and secret-key generator served at https://p.mss.io.
Secrets are generated in the browser with `crypto.getRandomValues`; the page cannot make network
requests. The spec at `docs/2026-09-26-pyrgus-web-spec.md` is the source of truth. A change to the
design updates the spec in the same commit; larger changes come as dated change specs that amend it
(see "Specs and plans").

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
- `tmp/` — gitignored downloads, placed there by the user; never commit

## Specs and plans

Everything lives flat in `docs/`. Never use a tool's default location (such as
`docs/superpowers/specs/`).

| File                                       | Purpose                                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| `docs/YYYY-MM-DD-<topic>-spec.md`          | Design: what and why. Approved by the user before any plan.                      |
| `docs/YYYY-MM-DD-<topic>-plan.md`          | Implementation plan: how, step by step. Written only after the spec is approved. |
| `docs/YYYY-MM-DD-<topic>-task-overview.md` | Optional one-table summary of a long plan.                                       |

`YYYY-MM-DD` is the date the spec was written; the plan and overview reuse the spec's date and
`<topic>`. `<topic>` is short kebab-case (`apps-dialog`).

**The binding spec**, `docs/2026-09-26-pyrgus-web-spec.md`, always describes the site as built. Edit
it only in the same commit as the code it describes.

**A change spec** (any later `-spec.md`):

- starts with `**Date:**`, `**Status:**` (`Draft` → `Approved YYYY-MM-DD` → `Implemented YYYY-MM-DD`),
  `**Amends:**` (the binding spec) and, once one exists, `**Plan:**`;
- has these sections, in order: Summary; Intent (what the user asked for, kept apart from
  assumptions); Non-goals; the design, per file or component; Security; Testing; Binding spec changes;
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
