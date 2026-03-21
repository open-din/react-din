# MatrixMixerNode

## Purpose
Route multiple audio inputs through a gain matrix with per-cell control handles.

## Props / Handles
- Data fields: `inputs`, `outputs`, `matrix`, `label`.
- Handles: audio inputs `in1..inN`, audio output `out`, per-cell targets `cell:<row>:<column>`.

## Defaults
- Added with `inputs 4`, `outputs 4`, an identity-like `matrix`, and label `Matrix Mixer`.

## Integration Notes
- Size is clamped to `2..8`; resizing rebuilds matrix handles and engine wiring.
- Each matrix cell exposes a stable modulation handle id (`cell:r:c`).

## Failure Modes
- Changing size without refresh desynchronizes UI handles and routing.
- Dense high-gain matrices can clip or overload output.

## Example
```tsx
// Two buses into Matrix Mixer, then Matrix Mixer -> Output.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F03-S06`, `F04-S02`
