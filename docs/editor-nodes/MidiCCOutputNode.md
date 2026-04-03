## Purpose
`MidiCCOutputNode` sends outbound CC values from graph control signals.

## Props / Handles
- Target handle: `value`
- Controls: output device, channel, controller number, value mode

## Defaults
- Output device: `Default`
- Channel: `1`
- Controller: `1`
- Value mode: `normalized`

## Integration Notes
Use it to forward graph modulation to hardware synths, mixers, or lighting controllers. The editor implementation now depends on the public `@din/react/midi` package surface so the node can move into `din-studio` without local `src/` imports.

## Failure Modes
If the chosen output disappears, the node shows the missing port and sends nothing.

## Example
Connect `LFO.out -> MidiCCOutputNode.value` to modulate hardware CC continuously.

## Test Coverage
Covered by `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
