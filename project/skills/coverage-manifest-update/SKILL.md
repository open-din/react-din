# SKILL: coverage-manifest-update

## REPO

`react-din`

## WHEN TO USE

- A mapped public surface changes
- Docs, tests, or scenario links drift from `project/COVERAGE_MANIFEST.json`

## STEPS

1. Read the target summary files plus `project/COVERAGE_MANIFEST.json`.
2. Update the affected manifest row with source, docs, tests, and scenarios.
3. Remove orphan references or add missing coverage rows.
4. Keep the manifest aligned with exported surface only.

## VALIDATION

- `npm run lint`
- `npm run typecheck`
- `npm run ci:check`
