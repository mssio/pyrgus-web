# Task 5: Entropy report

## RED / GREEN

- RED: `PATH=/Users/mss/.nvm/versions/node/v24.21.0/bin:$PATH npx vitest run src/core/entropy.test.ts` failed as expected because `./entropy` did not exist.
- GREEN: the same focused command passed after implementation: 1 test file, 11 tests.

## Final checks

- Node: `v24.21.0`.
- `PATH=/Users/mss/.nvm/versions/node/v24.21.0/bin:$PATH npm test` — passed, 7 files and 78 tests.
- `PATH=/Users/mss/.nvm/versions/node/v24.21.0/bin:$PATH npm run lint` — passed.
- `PATH=/Users/mss/.nvm/versions/node/v24.21.0/bin:$PATH npm run build` — passed (`tsc -b` and Vite production build).
- `git diff --check` — passed.

## Changed files

- `src/core/entropy.ts`
- `src/core/entropy.test.ts`
- `.superpowers/sdd/2026-09-26-pyrgus-web-plan/task-5-report.md`

## Self-review

Entropy is computed from the format specs and the wordlist size. The tests cover every cross-platform entropy vector, the documented Standard, Memorable, and PIN formulas, display formatting, and the Strong approximation marker. No format data, vectors, dependencies, or unrelated files were changed. No concerns found.
