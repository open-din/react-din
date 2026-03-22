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
Use it to forward graph modulation to hardware synths, mixers, or lighting controllers.

## Failure Modes
If the chosen output disappears, the node shows the missing port and sends nothing.

## Example
Connect `LFO.out -> MidiCCOutputNode.value` to modulate hardware CC continuously.

## Test Coverage
Covered by `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
