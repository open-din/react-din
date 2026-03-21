# AuxReturnNode

## Purpose
Reinject audio from a named aux bus back into the playground graph.

## Props / Handles
- Data fields: `busId`, `gain`, `label`.
- Handles: audio output `out`, parameter target `gain`.

## Defaults
- Added with `busId 'aux'`, `gain 1`, and label `Aux Return`.

## Integration Notes
- Must share the same `busId` as at least one `AuxSendNode`.
- Gain handle supports live control modulation.

## Failure Modes
- Missing send bus produces silence.
- High return gain can create runaway feedback loops.

## Example
```tsx
// Aux Return -> Matrix/Output.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F03-S06`, `F04-S02`

