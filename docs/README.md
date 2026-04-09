# Documentation Index

## Machine-generated API reference

Running `npm run docs:generate` emits TypeDoc markdown under `docs/generated/` (gitignored). Open those files on demand when you need export lists or signatures without browsing `src/`.

## Library Components

- Core: [AudioProvider](./components/core/AudioProvider.md)
- Nodes: [Gain](./components/nodes/Gain.md), [Filter](./components/nodes/Filter.md), [Osc](./components/nodes/Osc.md), [Delay](./components/nodes/Delay.md), [Compressor](./components/nodes/Compressor.md), [Convolver](./components/nodes/Convolver.md), [Panner](./components/nodes/Panner.md), [StereoPanner](./components/nodes/StereoPanner.md), [WaveShaper](./components/nodes/WaveShaper.md), [PresetWaveShaper](./components/nodes/PresetWaveShaper.md), [ADSR](./components/nodes/ADSR.md)
- Transport and sequencing: [TransportProvider](./components/transport/TransportProvider.md), [Sequencer](./components/sequencer/Sequencer.md), [Track](./components/sequencer/Track.md), [EventTrigger](./components/sequencer/EventTrigger.md)
- Analysis: [Analyzer](./components/analyzers/Analyzer.md)
- Sources: [Sampler](./components/sources/Sampler.md), [TriggeredSampler](./components/sources/TriggeredSampler.md), [Noise](./components/sources/Noise.md), [NoiseBurst](./components/sources/NoiseBurst.md), [MediaStream](./components/sources/MediaStream.md), [ConstantSource](./components/sources/ConstantSource.md), [LFO](./components/sources/LFO.md)
- Effects: [Reverb](./components/effects/Reverb.md), [Chorus](./components/effects/Chorus.md), [Distortion](./components/effects/Distortion.md)
- Patch: [Patch](./components/patch/Patch.md), [PatchOutput](./components/patch/PatchOutput.md), [PatchRenderer](./components/patch/PatchRenderer.md)
- MIDI: [MidiProvider](./components/midi/MidiProvider.md), [MidiNoteInput](./components/midi/MidiNoteInput.md), [MidiCCInput](./components/midi/MidiCCInput.md), [MidiNoteOutput](./components/midi/MidiNoteOutput.md), [MidiCCOutput](./components/midi/MidiCCOutput.md), [MidiTransportSync](./components/midi/MidiTransportSync.md)

## Architecture

- [Library architecture overview](./Architecture.md)

## Governance

- Coverage manifest: [`project/COVERAGE_MANIFEST.json`](../project/COVERAGE_MANIFEST.json)
- Patch schema: [`schemas/patch.schema.json`](../schemas/patch.schema.json)
- BDD features: [`project/features`](../project/features)
- Test matrix: [`project/TEST_MATRIX.md`](../project/TEST_MATRIX.md)
