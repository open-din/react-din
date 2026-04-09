# Skill: release-surface-check

## Triggers

- Before tagging or publishing `@open-din/react`.
- Final review PRs that touch `src/**`, `schemas/`, or manifests.

## Workflow

1. Run the full gate sequence in `AGENTS.md` (“Quality gates”).
2. Confirm `schemas/patch.schema.json` and `project/COVERAGE_MANIFEST.json` validate.
3. Verify DIN Studio compatibility: breaking patch or export changes should reference an accompanying `din-studio` / `din-core` plan in the PR description.

## Checks

- `npm run lint`
- `npm run typecheck`
- `npm run ci:check`
- `npm run validate:changes` when mapped files changed
- `npm run docs:generate` before tagging (`docs/generated/` is gitignored)

## Expected outputs

- Release surface (exports, schema, docs paths) matches published package layout.
