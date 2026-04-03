## Purpose
`MidiNoteNode` exposes a user-facing `Midi In` source that turns incoming MIDI note events into trigger, note, frequency, gate, and velocity graph outputs.

## Props / Handles
- Source handles: `trigger`, `frequency`, `note`, `gate`, `velocity`
- Controls: status, access, map toggle, active source, mapped sources, input device, channel, note filter, last note, velocity

## Defaults
- Input device: `Default`
- Channel: `All`
- Filter: `All Notes`
- Map: `Off`

## Integration Notes
Use it as the visual entrypoint for hardware keyboards and virtual MIDI inputs. When `Map` is enabled, the node learns note activity per `device + channel`, keeps a mapped-source list, and makes the last touched source active automatically without changing the note filter mode. Live-learned mapping updates stay outside the editor undo/redo history so keyboard shortcuts only rewind manual graph edits. The editor implementation now depends on the public `@din/react/midi` package surface so the node can move into `din-studio` without local `src/` imports.

## Failure Modes
Without MIDI access or a matching device, the node stays idle and shows `No device` or `Idle`. Learned mappings remain visible even if a saved input disappears, so users can see which source is disconnected.

## Example
Connect `MidiNoteNode.trigger -> Voice.trigger`, `Voice.note -> Osc.frequency`, and `Voice.gate -> ADSR.gate` for a keyboard-driven synth patch, then enable `Map` and play the keyboard you want to bind.

## Test Coverage
Covered by `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/node-helpers.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
