## Purpose
`MidiNoteOutput` sends outbound MIDI note messages from declarative React props.

## Props / Handles
- `outputId`
- `channel`
- `gate`
- `note`
- `frequency`
- `velocity`
- `triggerToken`
- `duration`

## Defaults
- Default output follows the provider.
- `channel`: `1`
- `gate`: `false`
- `velocity`: `1`
- `duration`: `0.1`

## Integration Notes
Use `gate` for held notes and `triggerToken` for one-shot note pulses. `note` wins over `frequency` when both are present.

## Failure Modes
If no output port is available, the component becomes a no-op.

## Example
```tsx
<MidiNoteOutput gate={playing} note={60} velocity={0.8} />
```

## Test Coverage
Covered by `tests/library/midi.spec.tsx` and change-gated through `F01-S04` and `F04-S02`.
