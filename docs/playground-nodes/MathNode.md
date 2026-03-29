# MathNode

## Purpose
Apply numeric transformations and functions to control values in the graph.

## Props / Handles
- Data fields: `operation`, `a`, `b`, `c`, `label`.
- Handles: parameter inputs for required operands and one result output.

## Defaults
- Added from the store with `operation "add"`, `a 0`, `b 0`, `c 0`, and label `Math`.

## Integration Notes
- Keep supported operations aligned with `@din/vanilla/core`, UI labels, and generated code.
- Route outputs into audio parameter targets or other data nodes.

## Failure Modes
- Operation lists drifting from runtime helpers cause impossible or broken configurations.
- Handle arity mismatches break saved connections.

## Example
```tsx
// Connect Params and Note outputs into Math, then route Math -> Filter frequency.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S02`, `F04-S02`
