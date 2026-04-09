# SKILL: patch-schema-change

## REPO

`react-din`

## WHEN TO USE

- `schemas/patch.schema.json` changes
- The public `PatchDocument` shape or published schema export changes

## STEPS

1. Read `project/SUMMARY.md`, `../docs/summaries/react-din-api.md`, and `project/REPO_MANIFEST.json`.
2. Update `schemas/patch.schema.json` and any exported patch helpers.
3. Coordinate `din-core` if serialization, persisted IDs, or round-trip behavior changes.
4. Keep docs, tests, and release-surface notes aligned.

## VALIDATION

- `npm run lint`
- `npm run typecheck`
- `npm run ci:check`
