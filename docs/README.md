# Documentation Index

## Library Components

- Core: [AudioProvider](./components/core/AudioProvider.md)
- Nodes: [Gain](./components/nodes/Gain.md), [Filter](./components/nodes/Filter.md), [Osc](./components/nodes/Osc.md), [Delay](./components/nodes/Delay.md), [Compressor](./components/nodes/Compressor.md), [Convolver](./components/nodes/Convolver.md), [Panner](./components/nodes/Panner.md), [StereoPanner](./components/nodes/StereoPanner.md), [WaveShaper](./components/nodes/WaveShaper.md), [PresetWaveShaper](./components/nodes/PresetWaveShaper.md), [ADSR](./components/nodes/ADSR.md)
- Transport and sequencing: [TransportProvider](./components/transport/TransportProvider.md), [Sequencer](./components/sequencer/Sequencer.md), [Track](./components/sequencer/Track.md), [EventTrigger](./components/sequencer/EventTrigger.md)
- Analysis: [Analyzer](./components/analyzers/Analyzer.md)
- Sources: [Sampler](./components/sources/Sampler.md), [TriggeredSampler](./components/sources/TriggeredSampler.md), [Noise](./components/sources/Noise.md), [NoiseBurst](./components/sources/NoiseBurst.md), [MediaStream](./components/sources/MediaStream.md), [ConstantSource](./components/sources/ConstantSource.md), [LFO](./components/sources/LFO.md)
- Effects: [Reverb](./components/effects/Reverb.md), [Chorus](./components/effects/Chorus.md), [Distortion](./components/effects/Distortion.md)
- Patch: [PatchRenderer](./components/patch/PatchRenderer.md)
- MIDI: [MidiProvider](./components/midi/MidiProvider.md), [MidiNoteInput](./components/midi/MidiNoteInput.md), [MidiCCInput](./components/midi/MidiCCInput.md), [MidiNoteOutput](./components/midi/MidiNoteOutput.md), [MidiCCOutput](./components/midi/MidiCCOutput.md), [MidiTransportSync](./components/midi/MidiTransportSync.md)

## DIN Editor Nodes

- [OscNode](./editor-nodes/OscNode.md), [GainNode](./editor-nodes/GainNode.md), [FilterNode](./editor-nodes/FilterNode.md), [OutputNode](./editor-nodes/OutputNode.md), [NoiseNode](./editor-nodes/NoiseNode.md), [DelayNode](./editor-nodes/DelayNode.md), [ReverbNode](./editor-nodes/ReverbNode.md), [CompressorNode](./editor-nodes/CompressorNode.md), [DistortionNode](./editor-nodes/DistortionNode.md), [ChorusNode](./editor-nodes/ChorusNode.md), [NoiseBurstNode](./editor-nodes/NoiseBurstNode.md), [WaveShaperNode](./editor-nodes/WaveShaperNode.md), [ConvolverNode](./editor-nodes/ConvolverNode.md), [AnalyzerNode](./editor-nodes/AnalyzerNode.md), [StereoPannerNode](./editor-nodes/StereoPannerNode.md), [Panner3DNode](./editor-nodes/Panner3DNode.md), [MixerNode](./editor-nodes/MixerNode.md), [InputNode](./editor-nodes/InputNode.md), [ConstantSourceNode](./editor-nodes/ConstantSourceNode.md), [MediaStreamNode](./editor-nodes/MediaStreamNode.md), [EventTriggerNode](./editor-nodes/EventTriggerNode.md), [NoteNode](./editor-nodes/NoteNode.md), [TransportNode](./editor-nodes/TransportNode.md), [StepSequencerNode](./editor-nodes/StepSequencerNode.md), [PianoRollNode](./editor-nodes/PianoRollNode.md), [LFONode](./editor-nodes/LFONode.md), [ADSRNode](./editor-nodes/ADSRNode.md), [VoiceNode](./editor-nodes/VoiceNode.md), [SamplerNode](./editor-nodes/SamplerNode.md), [MathNode](./editor-nodes/MathNode.md), [CompareNode](./editor-nodes/CompareNode.md), [MixNode](./editor-nodes/MixNode.md), [ClampNode](./editor-nodes/ClampNode.md), [SwitchNode](./editor-nodes/SwitchNode.md)
- MIDI nodes: [MidiNoteNode](./editor-nodes/MidiNoteNode.md), [MidiCCNode](./editor-nodes/MidiCCNode.md), [MidiNoteOutputNode](./editor-nodes/MidiNoteOutputNode.md), [MidiCCOutputNode](./editor-nodes/MidiCCOutputNode.md), [MidiSyncNode](./editor-nodes/MidiSyncNode.md)

## DIN Editor UX

- [DIN Editor Docs](./editor/README.md)
- [LauncherEntryFlows](./editor/LauncherEntryFlows.md)
- [SourceControlPanel](./editor/SourceControlPanel.md)
- [AudioLibraryPanel](./editor/AudioLibraryPanel.md)

## Governance

- Coverage manifest: [`project/COVERAGE_MANIFEST.json`](../project/COVERAGE_MANIFEST.json)
- Patch schema: [`schemas/patch.schema.json`](../schemas/patch.schema.json)
- BDD features: [`project/features`](../project/features)
- Test matrix: [`project/TEST_MATRIX.md`](../project/TEST_MATRIX.md)
