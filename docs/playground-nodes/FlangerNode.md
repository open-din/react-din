# FlangerNode

## Purpose
Expose short-delay modulation and feedback controls for flanging effects.

## Props / Handles
- Data fields: `rate`, `depth`, `feedback`, `delay`, `mix`, `label`.
- Handles: audio input `in`, audio output `out`, parameter targets `rate`, `depth`, `feedback`, `delay`, `mix`.

## Defaults
- Added with `rate 0.2`, `depth 2`, `feedback 0.5`, `delay 1`, `mix 0.5`, and label `Flanger`.

## Integration Notes
- Delay and depth are milliseconds and must stay converted consistently in engine/runtime.
- Connected handles replace sliders with live connected-value labels.

## Failure Modes
- High feedback can ring and clip.
- Unit mismatches (ms vs sec) cause incorrect sweep behavior.

## Example
```tsx
// Source -> Flanger -> Output.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F03-S05`, `F04-S02`

