# PianoRollNode

## Purpose
Edit note events over time with a piano-roll style interface.

## Props / Handles
- Data fields: `steps`, `octaves`, `baseNote`, `notes`, `label`.
- Handles: transport input and trigger output.

## Defaults
- Added from the store with `steps 16`, `octaves 2`, `baseNote 48`, `notes []`, and label `Piano Roll`.

## Integration Notes
- Keep note-event serialization aligned across UI editing, storage, transport wiring, and code generation.
- The shared shell keeps transport, step count, octave count, and base note in stable rows beneath the piano timeline widget.
- The shared local icon set is used by the widget header and shell affordances.
- Use with `VoiceNode` for pitch-aware trigger flows.

## Failure Modes
- Broken drag or overlap logic can corrupt note-event data.
- Over-compressing the timeline widget can preserve the shell but make note editing unusable.
- Disconnected piano rolls do not schedule note events until linked to `TransportNode`.
- Base-note or octave drift makes saved graphs hard to trust.

## Example
```tsx
// Connect Transport -> Piano Roll -> Voice to create pitched sequences.
```

## Test Coverage
- Automated: `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S03`, `F04-S02`
