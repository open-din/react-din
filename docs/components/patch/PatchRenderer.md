# PatchRenderer

## Purpose
Render a versioned `PatchDocument` as a live `@din/react` graph, or derive a reusable component with `importPatch(...)` for application code.

## Props / Handles
- `patch`: a validated `PatchDocument` v1 payload.
- `includeProvider`: wraps the patch in `AudioProvider` and `TransportProvider` when needed.
- `assetRoot`: prepends a base path to patch `assetPath` values for `sampler` and `convolver` nodes.
- Flat props generated from patch `interface.inputs[]`: numeric values keyed by the exported safe camelCase names.
- Flat props generated from patch `interface.events[]`: change-driven trigger tokens keyed by the exported safe camelCase names.
- `midi.inputs`: explicit note/CC bindings keyed by `interface.midiInputs[]`.
- `midi.outputs`: explicit output and sync bindings keyed by `interface.midiOutputs[]`.

## Defaults
- `includeProvider`: `false`
- `assetRoot`: unset, so `assetPath` is used as-is.
- Unbound public input props fall back to the patch document defaults.
- Unbound MIDI inputs and outputs stay inert; `PatchRenderer` does not instantiate `MidiProvider`.

## Integration Notes
- Use `importPatch(patch, options?)` when you want a reusable typed component instead of passing `patch` on every render.
- The public patch JSON contract is described by [`schemas/patch.schema.json`](../../../schemas/patch.schema.json) and published with the package at `@din/react/patch/schema.json`.
- Patch public props come only from playground `Input` and `EventTrigger` nodes.
- Patch MIDI bindings stay explicit in host code so the app keeps ownership of permissions, selected ports, and `MidiProvider`.
- When a patch contains a transport node or a bound MIDI sync output, `includeProvider` wraps the content in `TransportProvider`; `midi-master` sync forces transport `mode="manual"`.
- Export/import round-trips preserve editor positions, public interface metadata, and unresolved external `assetPath` references for sampler and convolver nodes.

## Failure Modes
- Unsupported patch versions, unknown node types, or invalid handles throw during `importPatch(...)` and `PatchRenderer` normalization.
- Missing `MidiProvider` means MIDI output bindings cannot send messages.
- Missing assets or a wrong `assetRoot` keep sampler/convolver nodes unresolved and silent.
- Omitting an explicit MIDI binding leaves the corresponding patch endpoint inactive by design.

## Example
```tsx
import { importPatch, MidiProvider, type PatchDocument } from '@din/react';

const patch = {
  version: 1,
  name: 'Lead Patch',
  nodes: [],
  connections: [],
  interface: {
    inputs: [{ id: 'input-1:cutoff', key: 'cutoff', label: 'Cutoff', kind: 'input', nodeId: 'input-1', paramId: 'cutoff', handle: 'param:cutoff', defaultValue: 0.5, min: 0, max: 1 }],
    events: [{ id: 'event-1', key: 'bang', label: 'Bang', kind: 'event', nodeId: 'event-1' }],
    midiInputs: [{ id: 'midi-note-1', key: 'keys', label: 'Keys', kind: 'midi-note-input', nodeId: 'midi-note-1' }],
    midiOutputs: [{ id: 'midi-note-out-1', key: 'noteOut', label: 'Note Out', kind: 'midi-note-output', nodeId: 'midi-note-out-1' }],
  },
} satisfies PatchDocument;

const Patch = importPatch(patch, { includeProvider: true, assetRoot: '/public' });

function App() {
  return (
    <MidiProvider requestOnMount>
      <Patch
        cutoff={0.7}
        bang={1}
        midi={{
          inputs: { keys: { gate: false, note: null, frequency: null, velocity: 0, channel: null, triggerToken: 0, activeNotes: [], lastEvent: null, source: { id: null, name: null } } },
          outputs: { noteOut: { outputId: 'synth-out' } },
        }}
      />
    </MidiProvider>
  );
}
```

## Test Coverage
- Automated: `tests/library/patch.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F01-S05`, `F03-S08`, `F04-S03`
