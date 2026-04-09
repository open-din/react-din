# SKILL: docs-component-author

## REPO

`react-din`

## WHEN TO USE

- `docs/components/*` changes
- Contributor-facing component docs must move with a public surface change

## STEPS

1. Read the repo summary, API summary, and manifest row for the target component.
2. Update the matching `docs/components/*` file with the current public surface.
3. Keep examples, props, and scenario references aligned with tests and exports.
4. Do not document editor-only or runtime-only ownership here.

## VALIDATION

- `npm run lint`
- `npm run typecheck`
- `npm run ci:check`
