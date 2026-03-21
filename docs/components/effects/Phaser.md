# Phaser

## Purpose
Add moving notch-style color using an all-pass stage chain with feedback.

## Props / Handles
- Key props: `rate`, `depth`, `feedback`, `baseFrequency`, `stages`, `mix`, `bypass`.
- Wrap tonal sources or submixes that need animated phase movement.

## Defaults
- `rate` defaults to `0.5`.
- `depth` defaults to `0.5`, `feedback` to `0.7`, `baseFrequency` to `1000`, `stages` to `4`, and `mix` to `0.5`.

## Integration Notes
- Keep feedback below `1` to avoid unstable resonance.
- Stage count and frequency ranges should stay aligned between docs and implementation.

## Failure Modes
- Excess feedback can self-oscillate or clip.
- Invalid stage counts can change tone unpredictably.

## Example
```tsx
<Phaser rate={0.6} depth={0.4}>
  <Osc autoStart />
</Phaser>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F03-S05`, `F04-S02`
