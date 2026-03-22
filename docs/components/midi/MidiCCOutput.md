## Purpose
`MidiCCOutput` sends outbound controller values declaratively.

## Props / Handles
- `outputId`
- `channel`
- `cc`
- `value`
- `valueFormat`

## Defaults
- Default output follows the provider.
- `channel`: `1`
- `valueFormat`: `normalized`

## Integration Notes
Use `normalized` values for modulation-style graphs and `raw` values when the exact 0-127 integer is already known.

## Failure Modes
If no output port is available, the component sends nothing.

## Example
```tsx
<MidiCCOutput cc={74} value={0.5} />
```

## Test Coverage
Covered by `tests/library/midi.spec.tsx` and change-gated through `F01-S04` and `F04-S02`.
