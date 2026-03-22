## Purpose
`MidiTransportSync` links MIDI clock/start/stop traffic with `TransportProvider`.

## Props / Handles
- `mode`
- `inputId`
- `outputId`
- `sendStartStop`
- `sendClock`

## Defaults
- `sendStartStop`: `true`
- `sendClock`: `true`
- Port selection follows provider defaults when omitted.

## Integration Notes
Use `mode="midi-master"` when external hardware should drive transport timing. Use `mode="transport-master"` when the transport should emit MIDI clock.

## Failure Modes
Missing transport context throws. Missing MIDI ports turns sync into a no-op.

## Example
```tsx
<TransportProvider mode="manual">
  <MidiTransportSync mode="midi-master" />
  <Graph />
</TransportProvider>
```

## Test Coverage
Covered by `tests/library/midi.spec.tsx` and `tests/library/transport-sequencer.spec.tsx`, change-gated through `F01-S04` and `F04-S02`.
