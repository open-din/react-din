# AuxSendNode

## Purpose
Send a controllable copy of an audio stream to a named aux bus.

## Props / Handles
- Data fields: `busId`, `sendGain`, `tap`, `label`.
- Handles: audio input `in`, audio output `out`, parameter target `sendGain`.

## Defaults
- Added with `busId 'aux'`, `sendGain 0.5`, `tap 'pre'`, and label `Aux Send`.

## Integration Notes
- Pair with `AuxReturnNode` using the same `busId`.
- `sendGain` supports handle modulation and connected-value display.

## Failure Modes
- Bus name mismatch leads to silent returns.
- Excessive send gain can overload return chains.

## Example
```tsx
// Source -> Aux Send -> Main chain, plus Aux Return on same bus.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F03-S06`, `F04-S02`

