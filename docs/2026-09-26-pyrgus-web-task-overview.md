# Pyrgus Web — Task Overview

This is a summary of the 12 tasks in the [implementation plan](2026-09-26-pyrgus-web-plan.md).
The [approved spec](2026-09-26-pyrgus-web-spec.md) defines the requirements; the plan contains the detailed steps, code examples, and tests.

| Task | Area | What it delivers | Complexity | Implementer | Reviewer |
|---|---|---|---|---|---|
| 1 | Project foundation | Agent rules, licence notices, Node 24 setup, pinned dependency checks, formatting, linting, build configuration, and the test harness. Removes the Vite demo. | Medium: many config files, all code given | Sonnet 5 ✅ | Sonnet 5 ✅ |
| 2 | Secure randomness | Buffered `crypto.getRandomValues`, unbiased integer selection, shuffling, and random bytes. Tests rejection sampling, distribution, and failure when secure randomness is unavailable. | Low–medium: 3 files, all code given, security-critical | Haiku 4.5 ✅ | Sonnet 5 ✅ |
| 3 | Format data | Character alphabets, the six format definitions, PIN length options, the verified EFF wordlist, and shared data for checking native-app parity. | Low: data and transcription; wordlist download and hash check | Haiku 4.5 | Sonnet 5 |
| 4 | Password and key generation | Generation for Standard, Strong, Memorable, PIN, Secret 128, and Secret 256. Tests output shape, exclusions, deterministic test inputs, and distribution. | Medium: all code given, but statistical tests may need diagnosis | Haiku 4.5 | Sonnet 5 |
| 5 | Entropy | Entropy calculations derived from format data and display formatting, including the approximate Strong figure. Checks formulas against the shared vectors. | Low: one small module, all code given | Haiku 4.5 | Sonnet 5 |
| 6 | Browser helpers | Clipboard copying and guarded 90-second clearing, validated preference storage, and character-by-character spoken output. Tests permission failures, blocked storage, and delayed clipboard operations. | High: async race conditions, fake timers | Sonnet 5 | Opus 5.5 |
| 7 | Application state | The `usePyrgus` hook: generation, format and PIN changes, preferences, copy feedback, errors, and announcements. Prevents stale copy results from updating feedback after newer actions. | High: React state with stale async results | Sonnet 5 | Opus 5.5 |
| 8 | Generator UI | Catalyst components, self-hosted fonts, format picker, PIN length control, wrapping secret display, copy/regenerate buttons, and error states. Includes component tests and visual checks. | High: copied vendor code, Headless UI in jsdom, many files | Sonnet 5 | Sonnet 5 |
| 9 | Complete page | Header, footer, native-app “coming soon” section, fixed-sample phone and widget mockups, metadata, favicon, social image, Apple touch icon, and static 404 page. | Medium: many files, Pocket port, PNG rendering | Sonnet 5 | Sonnet 5 |
| 10 | Security and browser verification | Production security headers, `/generate` redirect configuration, matching preview headers, and Playwright checks for CSP/Trusted Types, copying, narrow-screen wrapping, and build output. | High: CSP and Trusted Types failures only show in a real browser | Sonnet 5 | Opus 5.5 |
| 11 | Continuous integration | GitHub Actions for lint, build, unit/component tests, and browser tests; Dependabot configuration; verification from a clean install. | Low: two YAML files | Haiku 4.5 | Sonnet 5 |
| 12 | Documentation and final verification | The README, verification of its claims, reconciliation with the spec where needed, and a final clean-install check of all automated suites. | Low–medium: prose, and claims checked against the code | Haiku 4.5 | Sonnet 5 |
| — | Final whole-branch review | Reviews all 12 tasks together, plus the deferred minor findings. | High | — | Opus 5.5 |

✅ = already run. Other rows are the planned assignment and may change.

### How models are chosen

- **Per task, not per step.** One implementer runs every step of a task, and one reviewer checks the whole task afterwards. The steps below all use their task's models.
- **Implementer:** Haiku 4.5 when the plan gives the complete code and it's mostly transcription and testing. Sonnet 5 when the task needs judgment: integrating many files, async timing, vendor code, or diagnosing failures in a real browser.
- **Reviewer:** Sonnet 5 at minimum. Opus 5.5 for the three riskiest tasks (clipboard race conditions, stale async state, CSP) and for the final review.
- **Escalation:** if a review finds problems, the same implementer fixes them for up to three rounds. Rounds 4 and 5 go to a fresh implementer one tier up (Haiku → Sonnet → Opus). The fix re-reviews use Haiku 4.5 or Sonnet 5.

## Steps

The step titles from the plan, in order. The plan has the full content of each step.

### Task 1 — Project foundation

1. Write `AGENTS.md`
2. Write `CLAUDE.md`, `LICENSE`, `.nvmrc`
3. Remove the Vite boilerplate
4. Verify the pinned dependencies and set scripts and engines
5. Configure Prettier and extend `.gitignore`
6. Replace `vite.config.ts`
7. Replace `eslint.config.js`
8. Update `tsconfig.app.json`
9. Write the test-support helpers
10. Write the chi-squared self-test
11. Run the tests
12. Run lint, build and format
13. Commit

### Task 2 — Secure randomness

1. Write the failing tests
2. Run tests to verify they fail
3. Implement `src/core/random.ts`
4. Point the test helpers at the real interface
5. Run tests to verify they pass
6. Lint, build, commit

### Task 3 — Format data

1. Write `src/core/test-vectors.json`
2. Write the failing charset and format tests
3. Run tests to verify they fail
4. Implement `src/core/charsets.ts`
5. Implement `src/core/formats.ts`
6. Run the charset and format tests
7. Write the failing wordlist test
8. Run it to verify it fails
9. Generate `src/core/wordlist.ts` from EFF's file
10. Run the wordlist test
11. Lint, build, commit

### Task 4 — Password and key generation

1. Write the failing tests
2. Run tests to verify they fail
3. Implement `src/core/generate.ts`
4. Run tests to verify they pass
5. Lint, build, commit

### Task 5 — Entropy

1. Write the failing tests
2. Run tests to verify they fail
3. Implement `src/core/entropy.ts`
4. Run tests to verify they pass
5. Lint, build, commit

### Task 6 — Browser helpers

1. Write the failing clipboard tests
2. Write the failing preferences and spell tests
3. Run tests to verify they fail
4. Implement `src/lib/clipboard.ts`
5. Implement `src/lib/preferences.ts`
6. Implement `src/lib/spell.ts`
7. Run tests to verify they pass
8. Lint, build, commit

### Task 7 — Application state

1. Write the failing tests
2. Run tests to verify they fail
3. Implement `src/hooks/usePyrgus.ts`
4. Run tests to verify they pass
5. Lint, build, commit

### Task 8 — Generator UI

1. Copy the Catalyst components
2. Make the copied components pass lint and type-check without editing their logic
3. Add the fonts (self-hosted; no CDN)
4. Write the icons
5. Write the failing component tests
6. Run tests to verify they fail
7. Implement `src/components/SecretDisplay.tsx`
8. Implement `src/components/FormatPicker.tsx`
9. Implement `src/components/PinLengthControl.tsx`
10. Implement `src/components/GeneratorCard.tsx`
11. Wire it into `src/App.tsx`
12. Run tests to verify they pass
13. Full check, visual check, commit

### Task 9 — Complete page

1. Write the failing page test
2. Run it to verify it fails
3. Write `src/config.ts` and `src/components/Logo.tsx`
4. Write `src/components/Header.tsx` and `src/components/Footer.tsx`
5. Port Pocket's phone frame
6. Write `src/components/WidgetMockup.tsx` and `src/components/AppsSection.tsx`
7. Compose the page in `src/App.tsx`
8. Run the page test
9. Replace `index.html`
10. Write the favicon and 404 page
11. Render the OG image and Apple touch icon
12. Update the LICENSE exclusion if needed, then full check and commit

### Task 10 — Security and browser verification

1. Write the failing header-config test
2. Run it to verify it fails
3. Write `vercel.json`
4. Run it to verify it passes
5. Make `vite preview` send the same headers
6. Add Playwright config and its tsconfig
7. Write the Playwright specs
8. Run the end-to-end suite
9. Full check and commit

### Task 11 — Continuous integration

1. Write `.github/workflows/ci.yml`
2. Write `.github/dependabot.yml`
3. Simulate CI locally from a clean install
4. Commit

### Task 12 — Documentation and final verification

1. Replace `README.md`
2. Verify every README claim against the repo
3. Reconcile the spec
4. Final verification from a clean install
5. Commit

## How subagent-driven execution works

- Tasks run sequentially in plan order, with a fresh implementation subagent for each task.
- A separate review checks each task for spec compliance and code quality. Fixes normally return to that task’s implementer.
- A progress ledger records completed tasks, verification, and decisions so later batches do not repeat completed work.
- Every task must pass lint, build, and unit/component tests. End-to-end tests are also required from Task 10 onward.
- After all 12 tasks, a final whole-branch review checks the integrated result.

For the first three tasks, expect three implementation subagents and three task-review subagents, plus follow-up review runs if fixes are needed.

## After implementation

The plan leaves account and deployment actions to the user: create/configure the GitHub and Vercel projects, enable the required CI check, run hosted launch checks, move `p.mss.io`, archive the old deployment, and coordinate native-app parity updates. These are outside the 12 implementation tasks.
