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
Use it as the visual entrypoint for hardware keyboards and virtual MIDI inputs. When `Map` is enabled, the node learns note activity per `device + channel`, keeps a mapped-source list, and makes the last touched source active automatically without changing the note filter mode. The node now consumes the same `@din/react/midi` runtime surface used by generated React code, so editor previews and exported graphs stay aligned.

## Failure Modes
Without MIDI access or a matching device, the node stays idle and shows `No device` or `Idle`. Learned mappings remain visible even if a saved input disappears, so users can see which source is disconnected.

## Example
Connect `MidiNoteNode.trigger -> Voice.trigger`, `Voice.note -> Osc.frequency`, and `Voice.gate -> ADSR.gate` for a keyboard-driven synth patch, then enable `Map` and play the keyboard you want to bind.

## Test Coverage
Covered by `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/node-helpers.spec.ts`, and scenario gates `F02-S04` and `F03-S07`.
