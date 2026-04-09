# SKILL: release-surface-check

## REPO

`react-din`

## WHEN TO USE

- A request affects exports, published schema paths, or package release surface
- You need a final consistency pass before release-facing changes land

## STEPS

1. Read the repo summary, API summary, and repo manifest.
2. Verify exports, schema path, docs, tests, and coverage rows match.
3. Confirm the task did not drift into editor or runtime ownership.
4. Call out any required sibling coordination before merge.

## VALIDATION

- `npm run lint`
- `npm run typecheck`
- `npm run ci:check`
