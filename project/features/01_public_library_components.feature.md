# 01 Public Library Components

## Feature

Keep the public `react-din` component surface documented, testable, and safe to evolve.

### F01-S01 Core provider change stays documented and tested

**Given** a contributor changes `AudioProvider`
**When** they update the provider behavior
**Then** the mapped documentation page and mapped test file are updated in the same change

### F01-S02 Public audio node components stay aligned

**Given** a contributor changes a public audio node component such as `Gain`, `Filter`, `Osc`, or `ADSR`
**When** the change lands
**Then** docs, automated tests, and manifest mappings still describe the shipped behavior

### F01-S03 Transport, analyzer, source, and effect surfaces stay aligned

**Given** a contributor changes `TransportProvider`, `Sequencer`, `Track`, `Analyzer`, a source, or an effect
**When** they complete the change
**Then** the published docs and mapped automated coverage reflect the new behavior

### F01-S04 MIDI surfaces stay aligned

**Given** a contributor changes the public MIDI runtime, provider, hooks, or MIDI bridge components
**When** the change lands
**Then** docs, automated tests, and manifest mappings reflect the shipped MIDI behavior

### F01-S05 Patch import and runtime surfaces stay aligned

**Given** a contributor changes `PatchRenderer`, `importPatch`, or the published patch document contract
**When** the change lands
**Then** the public docs, automated coverage, and manifest mappings still describe the shipped patch behavior
