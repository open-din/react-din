# Flanger

## Purpose
Create short comb-filter motion with a modulated delay and feedback path.

## Props / Handles
- Key props: `rate`, `depth`, `feedback`, `delay`, `mix`, `bypass`.
- Wrap sources that need metallic motion or tape-like sweep.

## Defaults
- `rate` defaults to `0.2`.
- `depth` defaults to `2`, `feedback` to `0.5`, `delay` to `1`, and `mix` to `0.5`.

## Integration Notes
- Delay and depth are expressed in milliseconds.
- Keep feedback in a conservative range for browser-safe behavior.

## Failure Modes
- Large delay/depth can leave the classic flanger zone.
- High feedback can ring or distort.

## Example
```tsx
<Flanger rate={0.25} depth={3}>
  <Osc autoStart />
</Flanger>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F03-S05`, `F04-S02`

