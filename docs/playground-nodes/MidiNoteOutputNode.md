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
Use `gate` for held notes and `trigger` for one-shot note pulses. Connected values replace local controls in the UI. Outbound messages are now driven through the same `@din/react/midi` contract used by exported React graphs.

## Failure Modes
With no output port, the node remains silent.

## Example
Connect `Voice.note -> MidiNoteOutputNode.frequency`, `Voice.gate -> MidiNoteOutputNode.gate`, and `Voice.velocity -> MidiNoteOutputNode.velocity`.

## Test Coverage
Covered by `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
