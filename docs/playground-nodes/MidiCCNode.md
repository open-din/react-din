## Purpose
`MidiCCNode` exposes one MIDI controller stream as normalized and raw control outputs.

## Props / Handles
- Source handles: `normalized`, `raw`
- Controls: input device, channel, controller number, learn mode

## Defaults
- Input device: `Default`
- Channel: `All`
- Controller: `1`

## Integration Notes
Use it for knobs, faders, and pedals. Learn mode captures the next CC message and fills the controller selection. The editor reads controller state through the shared `@din/react/midi` bindings so the playground matches the public React runtime.

## Failure Modes
If the selected controller never arrives, outputs stay at zero.

## Example
Connect `MidiCCNode.normalized -> Filter.frequency` for direct knob control.

## Test Coverage
Covered by `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/node-helpers.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
