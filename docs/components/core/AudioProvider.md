# AudioProvider

## Purpose
Own the shared `AudioContext`, master bus, unlock flow, and audio state for the `@din/react` tree.

## Props / Handles
- Key props: `masterGain`, `manualUnlock`, `createOnUserGesture`, `contextOptions`, `debug`, `onUnlock`, `onStateChange`, `onError`.
- Wrap every public audio component inside one provider.

## Defaults
- `masterGain` defaults to `1`.
- Automatic unlock is enabled unless `manualUnlock` is set.

## Integration Notes
- Place `AudioProvider` at the root of each audio graph.
- Pair it with transport, analyzer, sources, nodes, and effects children.

## Failure Modes
- Without Web Audio support, context creation fails and `onError` receives the failure.
- If the context never unlocks, audio nodes remain inert.

## Example
```tsx
<AudioProvider masterGain={0.8}>
  <Gain gain={0.5}>
    <Osc autoStart />
  </Gain>
</AudioProvider>
```

## Test Coverage
- Automated: `tests/library/core-components.spec.tsx`
- Scenarios: `F01-S01`, `F04-S01`
