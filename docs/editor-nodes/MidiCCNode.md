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
Use it for knobs, faders, and pedals. Learn mode captures the next CC message and fills the controller selection. The editor implementation now depends on the public `@din/react/midi` package surface so the node can move into `din-studio` without local `src/` imports.

## Failure Modes
If the selected controller never arrives, outputs stay at zero.

## Example
Connect `MidiCCNode.normalized -> Filter.frequency` for direct knob control.

## Test Coverage
Covered by `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/node-helpers.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
