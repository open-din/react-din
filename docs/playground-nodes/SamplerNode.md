# SamplerNode

## Purpose
Load and trigger audio files directly from the playground.

## Props / Handles
- Data fields: `src`, `assetPath`, `loop`, `playbackRate`, `detune`, `loaded`, `sampleId`, `fileName`, `label`.
- Handles: trigger input `trigger`, control inputs `playbackRate` and `detune`, and audio output `out`.

## Defaults
- Added from the store with empty `src`, `loop false`, `playbackRate 1`, `detune 0`, `loaded false`, and label `Sampler`.

## Integration Notes
- Every numeric parameter exposes a dedicated target pin and uses connected-value mode when wired.
- Uploads create or reuse a global audio-library asset in cache storage and persist only the `sampleId` in graph documents.
- Patch export keeps `assetPath` as the external contract and clears transient object URLs so the graph can round-trip between playground and `importPatch(...)`.
- Imported patch graphs keep unresolved `assetPath` references visible in the node UI until the sound designer or developer relinks a local library asset.
- Keep cache IDs, object URLs, trigger semantics, and generated code semantics aligned across UI, storage, and engine loading.
- The node exposes a searchable library dropdown and can also be populated from the bottom audio-library panel.
- Use after a trigger-capable source or with manual playback from the node UI.

## Failure Modes
- Missing live routing updates can leave connected pins visually updated but sonically stale.
- File-cache drift can leave orphaned object URLs or stale `loaded` state.
- Missing or deleted library assets clear `src` and keep the node silent until a new asset is selected.
- Imported patch assets stay intentionally unresolved in the playground and remain silent until they are relinked to a local library entry.
- Rising-edge retrigger and loop-stop behavior must stay aligned between runtime and preview/export helpers.
- Engine load failures make the node appear configured while staying silent.

## Example
```tsx
// Add Sampler, load a file, then connect Sampler -> Output.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F04-S02`
