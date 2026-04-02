# GainNode

## Purpose
Control audio level in the editor graph.

## Props / Handles
- Data fields: `gain`, `label`.
- Handles: audio `in`, audio `out`, and gain control input.

## Defaults
- Added from the store with `gain 0.5` and label `Gain`.

## Integration Notes
- Every numeric parameter exposes a dedicated target pin and uses connected-value mode when wired.
- The node now uses the shared Figma-aligned shell: header, outputs, widget, then inputs.
- The shared local icon set is used for widget glyphs and shell affordances instead of emoji-only markers.
- Keep UI, store defaults, engine updates, and code generation aligned.
- Use downstream from sources and upstream from `OutputNode`.

## Failure Modes
- Missing live routing updates can leave connected pins visually updated but sonically stale.
- Duplicating the connected gain value in both widget and input rows makes the shell harder to scan and diverges from the wireframe contract.
- Missing control-handle updates can desync slider changes from generated code.
- Gain set incorrectly can hide whether an upstream node is working.

## Example
```tsx
// Add Gain and route Oscillator -> Gain -> Output.
```

## Test Coverage
- Automated: `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F04-S02`
