# TremoloNode

## Purpose
Expose rhythmic amplitude modulation controls for mono/stereo tremolo.

## Props / Handles
- Data fields: `rate`, `depth`, `waveform`, `stereo`, `mix`, `label`.
- Handles: audio input `in`, audio output `out`, parameter targets `rate`, `depth`, `mix`.

## Defaults
- Added with `rate 4`, `depth 0.5`, `waveform 'sine'`, `stereo false`, `mix 0.5`, and label `Tremolo`.

## Integration Notes
- Waveform and stereo are UI controls while numeric params remain modulate-able via handles.
- Live modulation must keep slider hiding and connected-value display behavior.

## Failure Modes
- Very high depth can sound like hard gating.
- Fast square-wave settings can introduce clicks.

## Example
```tsx
// Source -> Tremolo -> Output.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F03-S05`, `F04-S02`

