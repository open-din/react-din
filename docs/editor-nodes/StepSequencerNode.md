# StepSequencerNode

## Purpose
Trigger step-based patterns from the transport inside the editor.

## Props / Handles
- Data fields: `steps`, `pattern`, `activeSteps`, `label`.
- Handles: transport input and trigger output.

## Defaults
- Added from the store with `steps 16`, `pattern` filled with `0.8`, `activeSteps` filled with `false`, and label `Step Sequencer`.

## Integration Notes
- Keep step array lengths, trigger semantics, transport wiring, and code generation aligned.
- The node follows the shared shell order and keeps the pattern grid inside the widget while transport and step count remain in dedicated rows.
- The shared local icon set is used by the widget header and shell affordances.
- The node exposes a live playhead readout so the currently scheduled step is visible while the transport runs.
- Integration coverage should include transport-driven voice or drum graphs.

## Failure Modes
- Array-length drift can break rendering or trigger timing.
- Compressing the pattern UI too aggressively can remove velocity editing or make long patterns impossible to author.
- Disconnected sequencers do not run; missing `TransportNode` links leave the pattern visually editable but silent.
- Current-step feedback must use the effective step count or 32/64-step patterns drift visually.

## Example
```tsx
// Connect Transport -> Step Sequencer -> Voice trigger for a step-driven synth.
```

## Test Coverage
- Automated: `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`, `editor/tests/e2e/editor.spec.ts`
- Scenarios: `F02-S03`, `F04-S02`
