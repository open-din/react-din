# Workspace Topology

## Purpose

The repository is organized as a layered workspace so audio behavior can be shared across bindings instead of being duplicated per UI surface.

## Packages

- `din-core`: canonical Rust crate for core DSP, graph semantics, and patch contracts
- `@din/vanilla`: browser runtime and shared graph builders
- `@din/react`: React bindings over the vanilla runtime
- `@din/editor`: graph editor and playground
- `@din/examples`: runnable examples built against the public package surfaces
- `react-din`: compatibility shim that re-exports `@din/react`

## Integration Notes

- shared audio logic should be implemented in `din-core` or `@din/vanilla` before it is exposed in React or the editor
- editor-specific graph UI and generated code stay in `@din/editor`
- contributor-facing docs and coverage governance remain at the repository root
