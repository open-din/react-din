## Purpose
`MidiNoteOutputNode` sends outbound note messages from graph values.

## Props / Handles
- Target handles: `trigger`, `gate`, `note`, `frequency`, `velocity`
- Controls: output device, channel, local note, local frequency, local velocity

## Defaults
- Output device: `Default`
- Channel: `1`
- Local note: `60`
- Local velocity: `1`

## Integration Notes
Use `gate` for held notes and `trigger` for one-shot note pulses. Connected values replace local controls in the UI. The editor implementation now depends on the public `@din/react/midi` package surface so the node can move into `din-studio` without local `src/` imports.

## Failure Modes
With no output port, the node remains silent.

## Example
Connect `Voice.note -> MidiNoteOutputNode.frequency`, `Voice.gate -> MidiNoteOutputNode.gate`, and `Voice.velocity -> MidiNoteOutputNode.velocity`.

## Test Coverage
Covered by `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
