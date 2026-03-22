## Purpose
`MidiProvider` exposes one shared Web MIDI runtime to React components and hooks.

## Props / Handles
- `runtime`
- `requestOnMount`
- `defaultInputId`
- `defaultOutputId`
- `listenMode`
- `onStateChange`
- `onError`

## Defaults
- `requestOnMount`: `false`
- `listenMode`: `default`
- Default ports fall back to the first available input/output.

## Integration Notes
Place it above `useMidi`, `useMidiNote`, `useMidiCC`, `useMidiClock`, MIDI input bridges, MIDI output bridges, and `MidiTransportSync`. The playground uses a shared runtime instance so node UI and preview stay in sync.

## Failure Modes
Without a provider, MIDI hooks throw. Unsupported browsers report `unsupported`. Permission rejection reports `denied`.

## Example
```tsx
<MidiProvider requestOnMount>
  <MidiTransportSync mode="transport-master" />
  <App />
</MidiProvider>
```

## Test Coverage
Covered by `tests/library/midi.spec.tsx` and change-gated through `F01-S04` and `F04-S02`.
