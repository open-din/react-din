# CompressorNode

## Purpose
Expose a dynamics compressor in the playground with live threshold, knee, ratio, and timing control.

## Props / Handles
- Data fields: `threshold`, `knee`, `ratio`, `attack`, `release`, `sidechainStrength`, `label`.
- Handles: audio input `in`, audio sidechain input `sidechainIn`, audio output `out`, parameter targets `threshold`, `knee`, `ratio`, `attack`, `release`, `sidechainStrength`.

## Defaults
- Added with `threshold -24`, `knee 30`, `ratio 12`, `attack 0.003`, `release 0.25`, `sidechainStrength 0.7`, and label `Compressor`.

## Integration Notes
- Each numeric parameter has a stable target handle and supports connected-value display mode.
- Sidechain mode is activated by connecting an audio edge to `sidechainIn`.
- Keep node UI, store defaults, engine params, and generated code aligned.

## Failure Modes
- Missing live updates can leave control edges connected but inaudible.
- Invalid range mapping can make compression jump unexpectedly.

## Example
```tsx
// Compressor -> Output with threshold automation from Params.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F04-S02`
