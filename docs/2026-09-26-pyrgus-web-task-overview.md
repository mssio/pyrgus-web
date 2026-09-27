# Pyrgus Web — Task Overview

This is a summary of the 12 tasks in the [implementation plan](2026-09-26-pyrgus-web-plan.md).
The [approved spec](2026-09-26-pyrgus-web-spec.md) defines the requirements; the plan contains the detailed steps, code examples, and tests.

| Task | Area | What it delivers |
|---|---|---|
| 1 | Project foundation | Agent rules, licence notices, Node 24 setup, pinned dependency checks, formatting, linting, build configuration, and the test harness. Removes the Vite demo. |
| 2 | Secure randomness | Buffered `crypto.getRandomValues`, unbiased integer selection, shuffling, and random bytes. Tests rejection sampling, distribution, and failure when secure randomness is unavailable. |
| 3 | Format data | Character alphabets, the six format definitions, PIN length options, the verified EFF wordlist, and shared data for checking native-app parity. |
| 4 | Password and key generation | Generation for Standard, Strong, Memorable, PIN, Secret 128, and Secret 256. Tests output shape, exclusions, deterministic test inputs, and distribution. |
| 5 | Entropy | Entropy calculations derived from format data and display formatting, including the approximate Strong figure. Checks formulas against the shared vectors. |
| 6 | Browser helpers | Clipboard copying and guarded 90-second clearing, validated preference storage, and character-by-character spoken output. Tests permission failures, blocked storage, and delayed clipboard operations. |
| 7 | Application state | The `usePyrgus` hook: generation, format and PIN changes, preferences, copy feedback, errors, and announcements. Prevents stale copy results from updating feedback after newer actions. |
| 8 | Generator UI | Catalyst components, self-hosted fonts, format picker, PIN length control, wrapping secret display, copy/regenerate buttons, and error states. Includes component tests and visual checks. |
| 9 | Complete page | Header, footer, native-app “coming soon” section, fixed-sample phone and widget mockups, metadata, favicon, social image, Apple touch icon, and static 404 page. |
| 10 | Security and browser verification | Production security headers, `/generate` redirect configuration, matching preview headers, and Playwright checks for CSP/Trusted Types, copying, narrow-screen wrapping, and build output. |
| 11 | Continuous integration | GitHub Actions for lint, build, unit/component tests, and browser tests; Dependabot configuration; verification from a clean install. |
| 12 | Documentation and final verification | The README, verification of its claims, reconciliation with the spec where needed, and a final clean-install check of all automated suites. |

## How subagent-driven execution works

- Tasks run sequentially in plan order, with a fresh implementation subagent for each task.
- A separate review checks each task for spec compliance and code quality. Fixes normally return to that task’s implementer.
- A progress ledger records completed tasks, verification, and decisions so later batches do not repeat completed work.
- Every task must pass lint, build, and unit/component tests. End-to-end tests are also required from Task 10 onward.
- After all 12 tasks, a final whole-branch review checks the integrated result.

For the first three tasks, expect three implementation subagents and three task-review subagents, plus follow-up review runs if fixes are needed.

## After implementation

The plan leaves account and deployment actions to the user: create/configure the GitHub and Vercel projects, enable the required CI check, run hosted launch checks, move `p.mss.io`, archive the old deployment, and coordinate native-app parity updates. These are outside the 12 implementation tasks.
