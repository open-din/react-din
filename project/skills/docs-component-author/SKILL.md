# Skill: docs-component-author

## Triggers

- Creating or substantially revising `docs/components/**`.

## Workflow

1. Use the heading list in `AGENTS.md` under “Documentation contract”, in order:
   - Purpose, Props / Handles, Defaults, Integration Notes, Failure Modes, Example, Test Coverage
2. Link behavior to scenarios in `project/TEST_MATRIX.md` in the Test Coverage section (IDs, not prose duplication of the matrix).
3. Match tone and terminology from `project/USERFLOW.md` without copying long passages.

## Checks

- `npm run validate:docs`
- `npm run docs:generate` when components alter re-exported types (`docs/generated/` is gitignored)

## Expected outputs

- Component docs are complete and pass the documentation validator.
