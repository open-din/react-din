# TransportProvider

## Purpose
Coordinate musical timing, tempo, and playback state for descendants.

## Props / Handles
- Key props: `bpm`, `beatsPerBar`, `beatUnit`, `barsPerPhrase`, `stepsPerBeat`, `swing`, `swingSubdivision`, `mode`, and playback callbacks such as `onPlay` and `onStep`.
- Provide transport context to `useTransport`, `useBeat`, and related hooks.

## Defaults
- Defaults come from the transport config: `bpm 120`, `beatsPerBar 4`, `beatUnit 4`, `barsPerPhrase 4`, `stepsPerBeat 4`, `swing 0`, `mode="raf"`.
- Starts stopped until `play()` is called.

## Integration Notes
- Wrap sequencers or timing-aware UI inside `AudioProvider`.
- Use `mode="manual"` when an external clock is authoritative and another component drives `transport.update(...)`, for example `MidiTransportSync mode="midi-master"`.
- Keep timing changes aligned with sequencer and browser smoke coverage.

## Failure Modes
- Without an unlocked audio context, `play()` is ignored.
- In `mode="manual"`, the transport does not advance unless `update()` is called by the integrator.
- Inconsistent timing settings can break step expectations downstream.

## Example
```tsx
<TransportProvider bpm={128}>
  <Sequencer steps={16} />
</TransportProvider>
```

## Test Coverage
- Automated: `tests/library/transport-sequencer.spec.tsx`
- Scenarios: `F01-S03`, `F04-S02`
