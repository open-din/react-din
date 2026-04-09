# Skill: public-component-change

## Triggers

- Add or change an exported component under `src/**`.
- Prompts about public API, package exports, or `COVERAGE_MANIFEST` entries.

## Workflow

1. Read `project/USERFLOW.md` and `project/TEST_MATRIX.md` to pick scenario IDs that describe the behavior.
2. Implement in `src/**`; update package exports if the surface is public.
3. Add or update `docs/components/<Component>.md` using the exact headings required in `AGENTS.md`.
4. Update or add tests mapped from `project/COVERAGE_MANIFEST.json`.
5. Register the component in `project/COVERAGE_MANIFEST.json` if it is in-scope public surface.

## Checks

- `npm run lint` and `npm run typecheck`
- `npm run validate:docs` and `npm run validate:coverage`
- `npm run test:library`
- `npm run validate:changes` if the component is mapped
- `npm run docs:generate` after export or `src/index.ts` changes (`docs/generated/` is gitignored)

## Expected outputs

- Exports, docs (with mandated headings), tests, manifest row, and scenario IDs stay aligned.
