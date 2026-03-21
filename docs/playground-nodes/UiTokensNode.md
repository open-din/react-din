# UiTokensNode

## Purpose
Expose fixed UI feedback token counters (`hoverToken`, `successToken`, `errorToken`) as graph control outputs and let users trigger each token directly from the node.

## Props / Handles
- Data fields: `params`, `label`.
- Handles: one source handle per token row with stable IDs: `param:hoverToken`, `param:successToken`, `param:errorToken`.
- UI actions: each token row includes a tiny trigger button that increments only that token value.

## Defaults
- Added with label `UI Tokens`.
- Added with three fixed params (`hoverToken`, `successToken`, `errorToken`) initialized to `0`, with range `0..9999`.

## Integration Notes
- Behaves as an input-like control source in connection validation, code generation, preview rendering, and audio-engine live control updates.
- Designed for `EventTrigger` token routing (`token` target handle), but it can drive any compatible modulation target.
- Token rows can be added or removed from the right-side inspector (`Node Properties`) on the selected `UiTokensNode`.
- Legacy `InputNode` graphs labeled `UI Tokens` with token params migrate to `UiTokensNode` automatically on load.

## Failure Modes
- Missing fixed token params can break expected token handle availability for existing edges.
- Non-stable token IDs break persisted edge mappings and generated token prop names.
- Skipping migration leaves legacy graphs in mixed node types and can cause inconsistent palette/runtime behavior.

## Example
```tsx
// Add UI Tokens node, connect `param:hoverToken` to Event Trigger `token`,
// then click the Hover row trigger button to emit a token change.
```

## Test Coverage
- Automated: `playground/tests/unit/nodes-ui.spec.tsx`, `playground/tests/unit/store-and-codegen.spec.ts`, `playground/tests/unit/node-helpers.spec.ts`
- Scenarios: `F02-S02`, `F04-S02`
