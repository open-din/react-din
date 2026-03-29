import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function flattenBars(...bars) {
    return bars.flat();
}

function buildStepSequencerPattern(...bars) {
    const pattern = flattenBars(...bars);
    return {
        pattern,
        activeSteps: pattern.map((value) => value > 0),
    };
}

function makeNode(id, type, x, y, data) {
    return {
        id,
        type,
        position: { x, y },
        data: {
            type,
            ...data,
        },
    };
}

function makeConnection(id, source, sourceHandle, target, targetHandle) {
    return {
        id,
        source,
        sourceHandle,
        target,
        targetHandle,
    };
}

const kick = buildStepSequencerPattern(
    [1, 0, 0, 0, 0.78, 0, 0, 0],
    [0.52, 0, 0, 0, 0, 0, 0, 0],
    [0.82, 0, 0, 0.42, 0, 0.6, 0, 0.72],
    [1, 0, 0.74, 0, 0.92, 0, 0.68, 0.86],
    [0.48, 0, 0, 0, 0, 0, 0, 0],
    [0.76, 0, 0, 0.45, 0, 0.58, 0.64, 0.72],
    [1, 0, 0.78, 0.52, 0.94, 0, 0.72, 0.88],
    [0.66, 0, 0, 0, 0.42, 0, 0, 0],
);

const snare = buildStepSequencerPattern(
    [0, 0, 0.72, 0, 0, 0, 0.78, 0],
    [0, 0, 0.48, 0, 0, 0.22, 0.62, 0],
    [0, 0, 0.68, 0, 0.22, 0.34, 0.74, 0.42],
    [0, 0, 0.86, 0, 0.18, 0.42, 0.92, 0],
    [0, 0, 0.5, 0, 0, 0.18, 0.58, 0],
    [0, 0, 0.72, 0.28, 0.34, 0.48, 0.82, 0.6],
    [0, 0, 0.88, 0, 0.26, 0.46, 1, 0.18],
    [0, 0, 0.44, 0, 0, 0, 0.5, 0],
);

const hat = buildStepSequencerPattern(
    [0.22, 0, 0.28, 0, 0.24, 0, 0.32, 0],
    [0, 0.18, 0, 0.22, 0, 0.18, 0, 0.26],
    [0.28, 0.16, 0.34, 0.18, 0.32, 0.22, 0.42, 0.2],
    [0.4, 0.22, 0.46, 0.24, 0.42, 0.26, 0.5, 0.28],
    [0.18, 0, 0.24, 0, 0.18, 0, 0.28, 0],
    [0.3, 0.2, 0.36, 0.22, 0.34, 0.24, 0.42, 0.28],
    [0.42, 0.24, 0.48, 0.26, 0.44, 0.28, 0.54, 0.32],
    [0.18, 0, 0.22, 0, 0.18, 0, 0.24, 0],
);

const padNotes = [
    { pitch: 50, step: 0, duration: 6, velocity: 0.34 },
    { pitch: 53, step: 8, duration: 4, velocity: 0.26 },
    { pitch: 57, step: 12, duration: 3, velocity: 0.22 },
    { pitch: 50, step: 16, duration: 4, velocity: 0.38 },
    { pitch: 53, step: 20, duration: 4, velocity: 0.44 },
    { pitch: 57, step: 24, duration: 4, velocity: 0.54 },
    { pitch: 60, step: 28, duration: 4, velocity: 0.6 },
    { pitch: 48, step: 32, duration: 6, velocity: 0.3 },
    { pitch: 50, step: 40, duration: 2, velocity: 0.38 },
    { pitch: 53, step: 42, duration: 2, velocity: 0.44 },
    { pitch: 57, step: 44, duration: 2, velocity: 0.5 },
    { pitch: 60, step: 46, duration: 2, velocity: 0.56 },
    { pitch: 50, step: 48, duration: 4, velocity: 0.62 },
    { pitch: 57, step: 52, duration: 2, velocity: 0.68 },
    { pitch: 60, step: 54, duration: 2, velocity: 0.72 },
    { pitch: 50, step: 56, duration: 5, velocity: 0.3 },
    { pitch: 45, step: 61, duration: 3, velocity: 0.22 },
];

const patch = {
    version: 1,
    name: 'Atmospheric Breakbeat Arc 8 Bars',
    nodes: [
        makeNode('transport-1', 'transport', -180, 120, {
            bpm: 86,
            playing: false,
            beatsPerBar: 4,
            beatUnit: 4,
            stepsPerBeat: 2,
            barsPerPhrase: 8,
            swing: 0.1,
            label: 'Transport 8 Bars',
        }),
        makeNode('seq-kick', 'stepSequencer', 70, -180, {
            steps: 64,
            pattern: kick.pattern,
            activeSteps: kick.activeSteps,
            label: 'Kick Arc',
        }),
        makeNode('seq-snare', 'stepSequencer', 70, 0, {
            steps: 64,
            pattern: snare.pattern,
            activeSteps: snare.activeSteps,
            label: 'Snare Arc',
        }),
        makeNode('seq-hat', 'stepSequencer', 70, 180, {
            steps: 64,
            pattern: hat.pattern,
            activeSteps: hat.activeSteps,
            label: 'Hat Arc',
        }),
        makeNode('piano-pad', 'pianoRoll', 70, 400, {
            steps: 64,
            octaves: 3,
            baseNote: 36,
            notes: padNotes,
            label: 'Pad Arc',
        }),
        makeNode('voice-kick', 'voice', 360, -180, {
            portamento: 0,
            label: 'Kick Voice',
        }),
        makeNode('note-kick', 'note', 360, -10, {
            note: 'A',
            octave: 1,
            frequency: 55,
            language: 'en',
            label: 'Kick Pitch',
        }),
        makeNode('osc-kick', 'osc', 620, -180, {
            frequency: 55,
            detune: 0,
            waveform: 'sine',
            label: 'Kick Osc',
        }),
        makeNode('adsr-kick', 'adsr', 620, -20, {
            attack: 0.001,
            decay: 0.09,
            sustain: 0,
            release: 0.12,
            label: 'Kick Env',
        }),
        makeNode('gain-kick', 'gain', 880, -180, {
            gain: 0,
            label: 'Kick Amp',
        }),
        makeNode('noise-snare', 'noiseBurst', 360, 0, {
            noiseType: 'pink',
            duration: 0.16,
            gain: 0.78,
            attack: 0.001,
            release: 0.14,
            label: 'Snare Noise',
        }),
        makeNode('filter-snare', 'filter', 620, 0, {
            filterType: 'bandpass',
            frequency: 2100,
            detune: 0,
            q: 0.8,
            gain: 0,
            label: 'Snare Tone',
        }),
        makeNode('noise-hat', 'noiseBurst', 360, 180, {
            noiseType: 'white',
            duration: 0.045,
            gain: 0.34,
            attack: 0.001,
            release: 0.04,
            label: 'Hat Noise',
        }),
        makeNode('filter-hat', 'filter', 620, 180, {
            filterType: 'highpass',
            frequency: 7600,
            detune: 0,
            q: 0.7,
            gain: 0,
            label: 'Hat Air',
        }),
        makeNode('voice-pad', 'voice', 360, 400, {
            portamento: 0.04,
            label: 'Pad Voice',
        }),
        makeNode('adsr-pad', 'adsr', 360, 560, {
            attack: 0.6,
            decay: 1.2,
            sustain: 0.72,
            release: 1.8,
            label: 'Pad Env',
        }),
        makeNode('osc-pad-root', 'osc', 620, 340, {
            frequency: 220,
            detune: -3,
            waveform: 'sawtooth',
            label: 'Root Osc',
        }),
        makeNode('osc-pad-third', 'osc', 900, 470, {
            frequency: 261.63,
            detune: 304,
            waveform: 'triangle',
            label: 'Third Osc',
        }),
        makeNode('osc-pad-fifth', 'osc', 900, 600, {
            frequency: 329.63,
            detune: 702,
            waveform: 'sine',
            label: 'Fifth Osc',
        }),
        makeNode('gain-pad-root', 'gain', 1160, 340, {
            gain: 0.16,
            label: 'Root Level',
        }),
        makeNode('gain-pad-third', 'gain', 1160, 470, {
            gain: 0.11,
            label: 'Third Level',
        }),
        makeNode('gain-pad-fifth', 'gain', 1160, 600, {
            gain: 0.09,
            label: 'Fifth Level',
        }),
        makeNode('filter-pad', 'filter', 1420, 470, {
            filterType: 'lowpass',
            frequency: 950,
            detune: 0,
            q: 2.2,
            gain: 0,
            label: 'Pad Filter',
        }),
        makeNode('lfo-pad', 'lfo', 1420, 650, {
            rate: 0.06,
            depth: 420,
            waveform: 'sine',
            label: 'Slow Sweep',
        }),
        makeNode('constant-pad-cutoff', 'constantSource', 1420, 800, {
            offset: 1100,
            label: 'Cutoff Base',
        }),
        makeNode('math-pad-cutoff', 'math', 1670, 800, {
            operation: 'add',
            a: 1100,
            b: 0,
            c: 0,
            label: 'Cutoff Sum',
        }),
        makeNode('chorus-pad', 'chorus', 1670, 470, {
            rate: 0.18,
            depth: 4.5,
            feedback: 0.14,
            delay: 18,
            mix: 0.38,
            stereo: true,
            label: 'Chorus Mist',
        }),
        makeNode('delay-pad', 'delay', 1910, 470, {
            delayTime: 0.42,
            feedback: 0.3,
            label: 'Echo Tail',
        }),
        makeNode('reverb-pad', 'reverb', 2140, 470, {
            decay: 6.5,
            mix: 0.42,
            label: 'Sky Reverb',
        }),
        makeNode('gain-pad-master', 'gain', 2380, 470, {
            gain: 0,
            label: 'Pad Amp',
        }),
        makeNode('compressor-pad', 'compressor', 2620, 470, {
            threshold: -26,
            knee: 18,
            ratio: 5,
            attack: 0.004,
            release: 0.22,
            sidechainStrength: 0.78,
            label: 'Pad Duck',
        }),
        makeNode('output-1', 'output', 2890, 280, {
            playing: false,
            masterGain: 0.78,
            label: 'Output',
        }),
    ],
    connections: [
        makeConnection('transport-kick', 'transport-1', 'out', 'seq-kick', 'transport'),
        makeConnection('transport-snare', 'transport-1', 'out', 'seq-snare', 'transport'),
        makeConnection('transport-hat', 'transport-1', 'out', 'seq-hat', 'transport'),
        makeConnection('transport-pad', 'transport-1', 'out', 'piano-pad', 'transport'),

        makeConnection('kick-trigger', 'seq-kick', 'trigger', 'voice-kick', 'trigger'),
        makeConnection('kick-gate-env', 'voice-kick', 'gate', 'adsr-kick', 'gate'),
        makeConnection('kick-note', 'note-kick', 'freq', 'osc-kick', 'frequency'),
        makeConnection('kick-env-amp', 'adsr-kick', 'envelope', 'gain-kick', 'gain'),
        makeConnection('kick-osc-amp', 'osc-kick', 'out', 'gain-kick', 'in'),
        makeConnection('kick-out-main', 'gain-kick', 'out', 'output-1', 'in'),
        makeConnection('kick-sidechain', 'gain-kick', 'out', 'compressor-pad', 'sidechainIn'),

        makeConnection('snare-trigger', 'seq-snare', 'trigger', 'noise-snare', 'trigger'),
        makeConnection('snare-noise-filter', 'noise-snare', 'out', 'filter-snare', 'in'),
        makeConnection('snare-main', 'filter-snare', 'out', 'output-1', 'in'),

        makeConnection('hat-trigger', 'seq-hat', 'trigger', 'noise-hat', 'trigger'),
        makeConnection('hat-noise-filter', 'noise-hat', 'out', 'filter-hat', 'in'),
        makeConnection('hat-main', 'filter-hat', 'out', 'output-1', 'in'),

        makeConnection('pad-trigger', 'piano-pad', 'trigger', 'voice-pad', 'trigger'),
        makeConnection('pad-gate-env', 'voice-pad', 'gate', 'adsr-pad', 'gate'),
        makeConnection('pad-root-note', 'voice-pad', 'note', 'osc-pad-root', 'frequency'),
        makeConnection('pad-third-note', 'voice-pad', 'note', 'osc-pad-third', 'frequency'),
        makeConnection('pad-fifth-note', 'voice-pad', 'note', 'osc-pad-fifth', 'frequency'),
        makeConnection('pad-root-level', 'osc-pad-root', 'out', 'gain-pad-root', 'in'),
        makeConnection('pad-third-level', 'osc-pad-third', 'out', 'gain-pad-third', 'in'),
        makeConnection('pad-fifth-level', 'osc-pad-fifth', 'out', 'gain-pad-fifth', 'in'),
        makeConnection('pad-root-filter', 'gain-pad-root', 'out', 'filter-pad', 'in'),
        makeConnection('pad-third-filter', 'gain-pad-third', 'out', 'filter-pad', 'in'),
        makeConnection('pad-fifth-filter', 'gain-pad-fifth', 'out', 'filter-pad', 'in'),
        makeConnection('pad-cutoff-base', 'constant-pad-cutoff', 'out', 'math-pad-cutoff', 'a'),
        makeConnection('pad-cutoff-lfo', 'lfo-pad', 'out', 'math-pad-cutoff', 'b'),
        makeConnection('pad-cutoff-filter', 'math-pad-cutoff', 'out', 'filter-pad', 'frequency'),
        makeConnection('pad-filter-chorus', 'filter-pad', 'out', 'chorus-pad', 'in'),
        makeConnection('pad-chorus-delay', 'chorus-pad', 'out', 'delay-pad', 'in'),
        makeConnection('pad-delay-reverb', 'delay-pad', 'out', 'reverb-pad', 'in'),
        makeConnection('pad-reverb-amp', 'reverb-pad', 'out', 'gain-pad-master', 'in'),
        makeConnection('pad-env-amp', 'adsr-pad', 'envelope', 'gain-pad-master', 'gain'),
        makeConnection('pad-amp-duck', 'gain-pad-master', 'out', 'compressor-pad', 'in'),
        makeConnection('pad-duck-main', 'compressor-pad', 'out', 'output-1', 'in'),
    ],
    interface: {
        inputs: [],
        events: [],
        midiInputs: [],
        midiOutputs: [],
    },
};

const outputPath = resolve(process.cwd(), 'tmp/atmospheric-breakbeat-8bars.patch.json');
await writeFile(outputPath, `${JSON.stringify(patch, null, 2)}\n`, 'utf8');
process.stdout.write(`${outputPath}\n`);
