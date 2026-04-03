## Purpose
`MidiSyncNode` configures graph-level MIDI clock sync with the transport.

## Props / Handles
- No graph handles
- Controls: mode, input device, output device, start/stop send, clock send

## Defaults
- Mode: `transport-master`
- Start/stop send: enabled
- Clock send: enabled

## Integration Notes
This node is singleton because MIDI sync is global to the transport context. In `midi-master`, the transport follows incoming clock; in `transport-master`, the graph emits outgoing clock. The editor implementation now depends on the public `@din/react/midi` package surface so the node can move into `din-studio` without local `src/` imports.

## Failure Modes
Without a transport node or MIDI access, sync stays inactive.

## Example
Add `MidiSyncNode` beside `TransportNode` to bridge external hardware clock with the editor transport.

## Test Coverage
Covered by `editor/tests/unit/store-and-codegen.spec.ts`, `editor/tests/unit/nodes-ui.spec.tsx`, and scenario gates `F02-S04` and `F03-S07`.
