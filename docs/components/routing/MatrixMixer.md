# MatrixMixer

## Purpose
Route multiple input channels to multiple outputs through a configurable gain matrix.

## Props / Handles
- Key props: `inputs`, `outputs`, `matrix`, `smoothingTime`, `bypass`, `nodeRef`.
- Wrap upstream branches that need flexible cross-routing.

## Defaults
- `inputs` defaults to `4`, `outputs` to `4`.
- `matrix` defaults to an identity-like mapping and `smoothingTime` to `0.01`.

## Integration Notes
- Size is bounded to `2..8` for predictable performance.
- Use smoothing to avoid clicks when updating matrix cells live.

## Failure Modes
- Out-of-range matrix sizes are clamped.
- Dense high-gain matrices can clip combined outputs.

## Example
```tsx
<MatrixMixer inputs={2} outputs={2} matrix={[[1, 0.25], [0.1, 1]]}>
  <Osc autoStart />
</MatrixMixer>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F03-S06`, `F04-S02`
