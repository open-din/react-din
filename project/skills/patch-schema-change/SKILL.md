# Skill: patch-schema-change

## Triggers

- Edits to `schemas/patch.schema.json` or patch serialization in `src/patch/**`.
- Rust or studio questions about `PatchDocument` shape—coordinate with `din-core` and `din-studio` after the schema change lands here.

## Workflow

1. Treat `schemas/patch.schema.json` as authoritative; update it in the same branch as code changes.
2. Run `npm run validate:patch-schema` and fix drift in fixtures or validators.
3. Ensure the package export `@open-din/react/patch/schema.json` still resolves (`package.json` exports).
4. Note downstream impact: `din-core` patch contract and `din-studio` import paths may need sibling PRs.

## Checks

- `npm run validate:patch-schema`
- `npm run ci:check`
- `npm run docs:generate` after `src/patch/**` or root export surface shifts (`docs/generated/` is gitignored)

## Expected outputs

- Schema, tests, and any linked docs describe the same fields and enums.
