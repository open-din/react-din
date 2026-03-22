# 03 Playground Integration

## Feature

Exercise the visual playground as an integrated audio-graph editor instead of a collection of isolated controls.

### F03-S01 Voice synth graphs run across transport, sequencing, voice, envelope, and output

**Given** a contributor builds a synth graph in the playground
**When** they connect `Transport -> StepSequencer -> Voice -> Osc -> ADSR -> Gain -> Output`
**Then** the store, engine, UI, and generated code remain coherent

### F03-S02 Saved graphs reload safely

**Given** a contributor saves a graph that includes sampler or output state
**When** the playground reloads
**Then** the graph is restored and transient playback state is sanitized

### F03-S03 Generated React code matches mixed audio and data graphs

**Given** a contributor uses data nodes and audio nodes in the same graph
**When** they open the code generator
**Then** the generated React code represents both audio routing and control routing

### F03-S04 Browser audio smoke remains available

**Given** timing-sensitive or browser-only audio behavior changes
**When** automated mocks are not enough
**Then** manual smoke coverage remains documented for real browser verification

### F03-S05 New modulation effects stay coherent from node UI to runtime

**Given** a contributor updates `Phaser`, `Flanger`, `Tremolo`, or `EQ3`
**When** they wire the node in a running graph
**Then** parameters, handles, engine updates, and code generation stay aligned

### F03-S06 Advanced routing and sidechain remain stable during rewiring

**Given** a contributor uses `AuxSend`, `AuxReturn`, `MatrixMixer`, and compressor sidechain links
**When** they add/remove/rewire links while playback is running
**Then** routing updates immediately without stale bus links or broken generated code

### F03-S07 MIDI note, CC, and clock flows stay coherent across node UI, runtime, and generated code

**Given** a contributor builds a graph with MIDI input, MIDI output, or MIDI sync nodes
**When** they rewire the graph or open the code generator
**Then** node UI, runtime behavior, and generated React code stay coherent

### F03-S08 Patch export and round-trip import stay coherent

**Given** a contributor exports the active playground graph as patch JSON
**When** they import that patch back into the playground or render it through `importPatch`
**Then** the interface contract, MIDI metadata, positions, and external asset references stay coherent
