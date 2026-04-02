# FilterNode

## Purpose
Edit filter type and cutoff behavior on the editor canvas.

## Props / Handles
- Data fields: `filterType`, `frequency`, `detune`, `q`, `gain`, `label`.
- Handles: audio `in` and `out`, plus parameter inputs for filter controls.

## Defaults
- Added from the store with `filterType "lowpass"`, `frequency 1000`, `detune 0`, `q 1`, `gain 0`, and label `Filter`.

## Integration Notes
- Every numeric parameter exposes a dedicated target pin and uses connected-value mode when wired.
- The node uses the shared shell and keeps the response widget separate from input rows so the filter graph remains visually stable.
- The shared local icon set drives widget glyphs and compact affordances for filter controls.
- Keep defaults and parameter-handle names synchronized across store, engine, preview, and code generation.
- Use with `LFONode`, `ADSRNode`, or `MathNode` outputs for modulation.

## Failure Modes
- Missing live routing updates can leave connected pins visually updated but sonically stale.
- If the response widget and row controls drift apart, the filter can look correct while exporting or sounding wrong.
- Mismatched handle IDs break modulation wiring.
- `detune` and `gain` modulation must stay aligned across runtime and generated code, not only the sliders.
- Filter defaults drifting from code generation produce misleading exported code.

## Example
```tsx
// Connect Oscillator -> Filter -> Gain and modulate Filter frequency from an LFO.
```

## Test Coverage
- Automated: `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F04-S02`
