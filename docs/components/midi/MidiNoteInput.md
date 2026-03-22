## Purpose
`MidiNoteInput` bridges incoming MIDI note state into render-prop based React composition.

## Props / Handles
- `inputId`
- `channel`
- `note`
- `children`

## Defaults
- Default input selection follows the provider.
- Note filtering defaults to all notes.
- Channel filtering defaults to all channels.

## Integration Notes
Use it when you want note, frequency, gate, velocity, and trigger state without wiring subscriptions manually.

## Failure Modes
No matching device or filter produces an idle render state with `gate=false`.

## Example
```tsx
<MidiNoteInput>
  {({ frequency, gate }) => gate ? <Osc frequency={frequency ?? 440} /> : null}
</MidiNoteInput>
```

## Test Coverage
Covered by `tests/library/midi.spec.tsx` and change-gated through `F01-S04` and `F04-S02`.
