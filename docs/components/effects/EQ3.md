# EQ3

## Purpose
Shape tone with a low/mid/high three-band equalizer built on stable biquad filters.

## Props / Handles
- Key props: `low`, `mid`, `high`, `lowFrequency`, `highFrequency`, `mix`, `bypass`.
- Wrap full mixes or instruments that need quick tonal balancing.

## Defaults
- `low`, `mid`, and `high` default to `0`.
- `lowFrequency` defaults to `400`, `highFrequency` to `2500`, and `mix` to `1`.

## Integration Notes
- Crossovers are clamped to maintain a valid low/mid/high split.
- `mix` enables parallel EQ blending.

## Failure Modes
- Extreme boosts can clip downstream stages.
- Invalid crossover ordering can collapse the mid band.

## Example
```tsx
<EQ3 low={2} high={-1}>
  <Osc autoStart />
</EQ3>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F03-S05`, `F04-S02`

