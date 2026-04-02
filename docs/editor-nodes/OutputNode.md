# OutputNode

## Purpose
Own playback start/stop and master gain for the current editor graph.

## Props / Handles
- Data fields: `playing`, `masterGain`, `label`.
- Handles: audio `in` and master gain control input `masterGain`.

## Defaults
- Added from the store with `playing false`, `masterGain 0.5`, and label `Output`.

## Integration Notes
- Every numeric parameter exposes a dedicated target pin and uses connected-value mode when wired.
- The Figma-aligned sink shell keeps transport state and the compact meter inside the widget while input rows stay dedicated to routing and master control.
- The shared local icon set supplies the transport glyphs used by the output widget.
- `OutputNode` must remain aligned with store playback state and `audioEngine.start/stop`.
- Integration coverage should keep graph persistence resetting `playing` to `false`.

## Failure Modes
- Missing live routing updates can leave connected pins visually updated but sonically stale.
- Regressing to a generic node shell can hide the singleton sink role and reduce playback-state clarity.
- Persisting transient playback state can reload graphs in a broken state.
- Starting output without a valid graph can create confusing no-audio behavior.

## Example
```tsx
// Connect Gain -> Output and use the play button to start the current graph.
```

## Test Coverage
- Automated: `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`, `editor/tests/e2e/editor.spec.ts`
- Scenarios: `F02-S01`, `F04-S02`
