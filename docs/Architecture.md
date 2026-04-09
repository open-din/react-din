# Architecture (library)

## Purpose

High-level map of how `@open-din/react` pieces fit together for agents and contributors.

## Layers

- **`AudioProvider` / `TransportProvider` / `MidiProvider`** establish shared Web Audio, timing, and MIDI context for descendant trees.
- **Nodes** (`src/nodes`, `src/sources`, `src/effects`, …) wrap `AudioNode` construction and modulation via props aligned with the patch schema.
- **`patch/`** owns `PatchDocument` typing, validation helpers, and nested patch runtime (`Patch`, `PatchOutput`, …) shared with DIN Studio and `din-core`.
- **Published subpaths** (`/midi`, `/data`, `/patch`, …) mirror folder ownership—see package `exports` in `package.json`.

## Data flow

User JSX → React tree → hooks attach and update `AudioParam` / child nodes → patch JSON (when used offline) round-trips through `schemas/patch.schema.json`.

## Cross-repo

- Schema source: `schemas/patch.schema.json` (kept in sync with `din-core` and `din-studio` consumers).
- Editor UX and codegen live in `din-studio`, not here.

## See also

- Component docs: [docs/README.md](./README.md)
- Generated API listing: run `npm run docs:generate` then open `docs/generated/` (gitignored).
