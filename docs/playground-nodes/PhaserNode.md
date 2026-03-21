# PhaserNode

## Purpose
Provide phase-sweep modulation controls in the playground graph.

## Props / Handles
- Data fields: `rate`, `depth`, `feedback`, `baseFrequency`, `stages`, `mix`, `label`.
- Handles: audio input `in`, audio output `out`, parameter targets `rate`, `depth`, `feedback`, `baseFrequency`, `stages`, `mix`.

## Defaults
- Added with `rate 0.5`, `depth 0.5`, `feedback 0.7`, `baseFrequency 1000`, `stages 4`, `mix 0.5`, and label `Phaser`.

## Integration Notes
- Connected parameter handles hide the slider and display live values.
- Keep stage count synchronized between store defaults and engine rebuilding logic.

## Failure Modes
- Extreme feedback can destabilize output.
- Stage-count updates without graph refresh can desync sound and UI.

## Example
```tsx
// Oscillator -> Phaser -> Output.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F03-S05`, `F04-S02`

