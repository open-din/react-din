# SKILL: public-component-change

## REPO

`react-din`

## WHEN TO USE

- Public component, hook, or package export changes
- `docs/components/*` or `project/COVERAGE_MANIFEST.json` changes

## STEPS

1. Read `project/SUMMARY.md`, `../docs/summaries/react-din-api.md`, and `project/REPO_MANIFEST.json`.
2. Update `src/**` and any public export touched by the request.
3. Update docs, tests, and coverage rows together.
4. Escalate only if schema, serialization, persisted IDs, or round-trip compatibility changes.

## VALIDATION

- `npm run lint`
- `npm run typecheck`
- `npm run ci:check`
- `npm run validate:changes`
