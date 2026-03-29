# MediaStream

## Purpose
Route microphone or external `MediaStream` audio into a `@din/react` graph.

## Props / Handles
- Key props: `stream`, `requestMic`, `constraints`, `onStream`, `onError`, `nodeRef`.
- Outputs the acquired stream into the parent audio bus.

## Defaults
- `requestMic` defaults to `false`.
- No stream is created until `stream` or `requestMic` is provided.

## Integration Notes
- Use for live input monitoring, analysis, or effects.
- Browser permission flow changes must remain documented and manually smoke-tested.

## Failure Modes
- Permission denial or unsupported media APIs prevent stream creation.
- Created streams must be cleaned up on unmount.

## Example
```tsx
<MediaStream requestMic>
  <Analyzer onAnalyze={console.log} />
</MediaStream>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F04-S02`
