# AuxSend

## Purpose
Tap an audio stream and send a controllable copy to a named auxiliary bus.

## Props / Handles
- Key props: `busId`, `sendGain`, `tap`, `bypass`, `nodeRef`.
- Wrap the upstream signal branch that should feed an aux bus.

## Defaults
- `busId` defaults to `'aux'`.
- `sendGain` defaults to `0.5`, `tap` to `'pre'`, and `bypass` to `false`.

## Integration Notes
- Pair with `AuxReturn` using the same `busId`.
- Keep `sendGain` automation smoothed to avoid clicks.

## Failure Modes
- Mismatched bus IDs produce silent sends.
- Excessive send gain can overload return effects.

## Example
```tsx
<AuxSend busId="fx" sendGain={0.4}>
  <Osc autoStart />
</AuxSend>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F03-S06`, `F04-S02`

