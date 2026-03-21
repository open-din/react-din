# AuxReturn

## Purpose
Read audio from a named auxiliary bus and return it to the current output chain.

## Props / Handles
- Key props: `busId`, `gain`, `bypass`, `nodeRef`.
- Place in a branch where the aux bus signal should be reinjected.

## Defaults
- `busId` defaults to `'aux'`.
- `gain` defaults to `1` and `bypass` to `false`.

## Integration Notes
- Use with `AuxSend` on the same `busId`.
- Keep return level conservative when feeding compressed outputs.

## Failure Modes
- Wrong bus ID gives no audible return.
- High return gain can create feedback with recursive routing.

## Example
```tsx
<>
  <AuxSend busId="fx"><Osc autoStart /></AuxSend>
  <AuxReturn busId="fx" gain={0.7} />
</>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F03-S06`, `F04-S02`

