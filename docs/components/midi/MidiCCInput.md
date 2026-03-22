## Purpose
`MidiCCInput` exposes one controller stream as render-prop state.

## Props / Handles
- `inputId`
- `channel`
- `cc`
- `children`

## Defaults
- Input selection follows the provider.
- Channel filtering defaults to all channels.

## Integration Notes
Use it when a component tree should react to one CC source without custom hook plumbing.

## Failure Modes
If the selected controller never arrives, the rendered values stay at zero.

## Example
```tsx
<MidiCCInput cc={1}>
  {({ normalized }) => <Filter frequency={200 + normalized * 4000} />}
</MidiCCInput>
```

## Test Coverage
Covered by `tests/library/midi.spec.tsx` and change-gated through `F01-S04` and `F04-S02`.
