# Tremolo

## Purpose
Apply amplitude modulation to produce rhythmic volume movement.

## Props / Handles
- Key props: `rate`, `depth`, `waveform`, `stereo`, `mix`, `bypass`.
- Wrap sources or buses that need periodic gain modulation.

## Defaults
- `rate` defaults to `4`.
- `depth` defaults to `0.5`, `waveform` to `'sine'`, `stereo` to `false`, and `mix` to `0.5`.

## Integration Notes
- Use `stereo` for alternating left/right modulation.
- Keep depth moderate for transparent musical tremolo.

## Failure Modes
- Depth near `1` can fully gate the signal.
- Fast square-wave settings can sound clicky.

## Example
```tsx
<Tremolo rate={6} depth={0.7}>
  <Osc autoStart />
</Tremolo>
```

## Test Coverage
- Automated: `tests/library/sources-effects.spec.tsx`
- Scenarios: `F01-S03`, `F03-S05`, `F04-S02`

