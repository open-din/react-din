# AGENTS

Canonical project contract for Codex, Claude, Cursor, and other agents. Product flow context: `project/SUMMARY.md`, `project/USERFLOW.md`, and `project/TEST_MATRIX.md`—cite them; do not duplicate them in agent rules.

## Documentation language

- Keep repository documentation in English.
- Scope: `README.md`, `docs/**/*.md`, `project/**/*.md`, contributor-facing markdown, and public JSDoc on exported components.
- Exception: intentional API examples may use domain-specific values such as French solfege note names when they demonstrate supported inputs.

## Documentation contract

- Every file under `docs/components/**` must include these headings:
  - `## Purpose`
  - `## Props / Handles`
  - `## Defaults`
  - `## Integration Notes`
  - `## Failure Modes`
  - `## Example`
  - `## Test Coverage`

## UI copy governance

- Keep contributor-facing and user-facing UI text in dedicated copy modules instead of scattering repeated string literals across components.
- A UI change that adds or edits visible copy is incomplete until the relevant copy source changes in the same branch.

## Coverage governance

- `project/COVERAGE_MANIFEST.json` is the source of truth for in-scope public components in this repository.
- Every mapped item must keep its `source`, `docs`, `tests`, and `scenarios` entries current.
- A change to a mapped source file is incomplete until the mapped documentation file and at least one mapped test file change in the same branch.

## DIN Studio boundary

- DIN Studio-owned features, editor scenarios, and editor tests live in the sibling `din-studio` repository, not in `react-din`.
- Changes to DIN Studio-owned behavior and product workflows must update the DIN Studio project docs and tests in that repository.

## Patch schema governance

- `schemas/patch.schema.json` is the source of truth for the public JSON shape of `PatchDocument`.
- Any change to the patch document structure, public patch interface entries, or serialized patch metadata is incomplete until `schemas/patch.schema.json` is updated in the same branch.
- The published package must keep exporting the schema at `@open-din/react/patch/schema.json`.

## Component rules

- A new public component is incomplete until it updates exports, docs, tests, and `project/COVERAGE_MANIFEST.json`.

## Quality gates (pre-merge)

1. `npm run lint`
2. `npm run typecheck`
3. `npm run ci:check` (documentation, patch schema, coverage manifests, and library tests)
4. `npm run validate:changes` before merging source changes that touch **mapped** components or coverage entries
5. (Recommended after public API edits) `npm run docs:generate` — refreshes TypeDoc markdown under `docs/generated/` (gitignored)

Portable workflows for repeating tasks: `project/skills/*/SKILL.md`.

## Documentation Strategy

- Prefer `docs/**` hand-written component docs and on-demand `docs/generated/` TypeDoc output over reading raw `src/**` when you only need signatures or exports.
- Do not attach generated docs to context by default; open them when resolving API surface questions.

## Documentation Rules

- Public exports should carry JSDoc; `eslint-plugin-jsdoc` flags gaps as warnings.
- Hand-written docs describe behavior and integration; generated docs describe machine-checked API shape—avoid duplicating prose between them.
