# NoteNode

## Purpose
Emit note-derived control data such as pitch frequency from a note selector.

## Props / Handles
- Data fields: `note`, `octave`, `frequency`, `language`, `label`.
- Handles: `freq` output only for downstream pitch targets. `trigger` is intentionally not part of the node contract.

## Defaults
- Added from the store with `note "C"`, `octave 4`, `frequency 261.6`, `language "en"`, and label `Note`.

## Integration Notes
- Keep note conversion behavior aligned with `@din/react` note utilities and the node UI.
- Use with `OscNode` or `VoiceNode` frequency inputs.

## Failure Modes
- Language or note conversion drift makes the displayed note disagree with generated frequency.
- Legacy graphs that still target `Note.trigger` should be migrated away from that removed handle.

## Example
```tsx
// Connect Note -> Oscillator frequency for a note-driven source.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S02`, `F04-S02`
