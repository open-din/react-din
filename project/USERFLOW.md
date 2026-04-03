# Contributor Flow

1. Pick the public library component or contract that needs to change.
2. Update its source behavior and any required library integration touch points.
3. Update the mapped documentation page under `docs/components/**`.
4. Update at least one mapped automated test file and keep the relevant BDD scenario IDs current.
5. If the item is new, register it everywhere required and add it to `project/COVERAGE_MANIFEST.json`.
6. Run `validate:docs`, `validate:patch-schema`, `validate:coverage`, `validate:changes`, and the relevant library tests before review.
