# EQ3Node

## Purpose
Expose low/mid/high tone-shaping with two crossover controls in playground graphs.

## Props / Handles
- Data fields: `low`, `mid`, `high`, `lowFrequency`, `highFrequency`, `mix`, `label`.
- Handles: audio input `in`, audio output `out`, parameter targets `low`, `mid`, `high`, `lowFrequency`, `highFrequency`, `mix`.

## Defaults
- Added with `low 0`, `mid 0`, `high 0`, `lowFrequency 400`, `highFrequency 2500`, `mix 1`, and label `EQ3`.

## Integration Notes
- Crossover ranges must remain clamped to preserve a valid band split.
- Connected value UI must mirror incoming control signals while playback runs.

## Failure Modes
- Invalid crossover ordering collapses the mid band behavior.
- High boosts can clip downstream effects.

## Example
```tsx
// Source -> EQ3 -> Output.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F03-S05`, `F04-S02`

