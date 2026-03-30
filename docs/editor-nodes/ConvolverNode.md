# ConvolverNode

## Purpose
Load and apply impulse responses for UI reverb and spatial coloration using uploaded audio files.

## Props / Handles
- Data fields: `impulseSrc`, `assetPath`, `impulseId`, `impulseFileName`, `normalize`, `label`.
- Handles: audio input `in`, audio output `out`.

## Defaults
- Added with empty `impulseSrc`, empty `impulseId`, empty `impulseFileName`, `normalize true`, and label `Convolver`.

## Integration Notes
- Keep async impulse loading behavior aligned across node UI, engine, and generated `Convolver` props.
- Uploads create or reuse a project-scoped audio-library asset and persist the resolved project-relative `assetPath` for patch export.
- Patch export keeps `assetPath` as the exchange contract and clears transient object URLs so the graph can round-trip through patch JSON.
- Imported patch graphs keep unresolved `assetPath` references visible until a local library asset is relinked.
- The node exposes a searchable library dropdown and can also consume assets managed in the bottom audio-library panel.
- Selecting an impulse from the project library should preserve the library record path instead of synthesizing a separate global cache path.
- Use with short IR files for low-latency UI feedback sounds.

## Failure Modes
- Missing or invalid uploaded files keep the node silent or dry.
- Missing or deleted library assets clear `impulseSrc` and keep the convolver dry.
- Imported patch assets stay unresolved in the editor by design and remain dry until they are relinked locally.
- Loading race conditions can swap IRs during rapid edits.

## Example
```tsx
// Upload `plate.wav` in Convolver, then route:
// Sampler -> Convolver -> Output.
```

## Test Coverage
- Automated: `editor/tests/unit/nodes-ui.spec.tsx`, `editor/tests/unit/store-and-codegen.spec.ts`
- Scenarios: `F02-S01`, `F04-S02`
