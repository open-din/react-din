# Skill: coverage-manifest-update

## Triggers

- Additions to `project/COVERAGE_MANIFEST.json` or missing `source` / `docs` / `tests` / `scenarios` links.

## Workflow

1. Open `project/COVERAGE_MANIFEST.json` and `project/TEST_MATRIX.md`; every `scenarios` entry must appear in the matrix.
2. For each item, ensure files exist at `source`, `docs`, and every path in `tests`.
3. Run `node ./scripts/validate-coverage.mjs` (also executed via `npm run validate:coverage`).
4. If you change a mapped `source`, run `npm run validate:changes`.

## Checks

- `npm run validate:coverage`
- `npm run validate:changes` when mapped sources move
- `npm run docs:generate` when mapped `source` files change public exports (`docs/generated/` is gitignored)

## Expected outputs

- Manifest, matrix, filesystem paths, and feature IDs stay consistent.
