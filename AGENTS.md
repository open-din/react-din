# Repository Rules

## Documentation Language

- Keep repository documentation in English.
- Scope: `README.md`, `docs/**/*.md`, `project/**/*.md`, contributor-facing markdown, and public JSDoc on exported components.
- Exception: intentional API examples may use domain-specific values such as French solfege note names when they demonstrate supported inputs.

## Documentation Contract

- Every file under `docs/components/**` and `docs/playground-nodes/**` must include these headings:
  - `## Purpose`
  - `## Props / Handles`
  - `## Defaults`
  - `## Integration Notes`
  - `## Failure Modes`
  - `## Example`
  - `## Test Coverage`

## Coverage Governance

- `project/COVERAGE_MANIFEST.json` is the source of truth for in-scope public components and playground nodes.
- Every mapped item must keep its `source`, `docs`, `tests`, and `scenarios` entries current.
- A change to a mapped source file is incomplete until the mapped documentation file and at least one mapped test file change in the same branch.

## Patch Schema Governance

- `schemas/patch.schema.json` is the source of truth for the public JSON shape of `PatchDocument`.
- Any change to the patch document structure, public patch interface entries, or serialized patch metadata is incomplete until `schemas/patch.schema.json` is updated in the same branch.
- The published package must keep exporting the schema at `@din/react/patch/schema.json`.

## Component And Node Rules

- A new public component is incomplete until it updates exports, docs, tests, and `project/COVERAGE_MANIFEST.json`.
- A new playground node is incomplete until it updates:
  - `playground/src/playground/nodes/index.ts`
  - `playground/src/PlaygroundDemo.tsx`
  - `playground/src/playground/store.ts`
  - `playground/src/playground/AudioEngine.ts`
  - `playground/src/playground/CodeGenerator.tsx`
  - docs, tests, and `project/COVERAGE_MANIFEST.json`
- Every modulate-able numeric node parameter must expose a dedicated target handle (pin) with a stable handle id.
- When a target handle is connected for a slider-backed parameter, the UI must hide or disable the slider and show the connected value instead.
- Every node parameter control must render on its own row. Multi-column parameter grids are not allowed for node parameter sections.
- Every pin must overlap the node border by exactly 50% of the pin diameter.
- Connected pin values shown in the UI must auto-refresh from the live input signal while audio is running.
- Any node addition or change that affects parameters or handles must preserve real-time audible updates while output is playing:
  - parameter edits update sound immediately
  - connection add/remove/rewire updates routing immediately

## Required Checks

- Run `npm run validate:docs`.
- Run `npm run validate:patch-schema`.
- Run `npm run validate:coverage`.
- Run `npm run test:library`.
- Run `npm run test:editor`.
- Run `npm run validate:changes` before merging source changes that touch mapped components or nodes.
