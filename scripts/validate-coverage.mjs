import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'project/COVERAGE_MANIFEST.json');
const testMatrixPath = path.join(root, 'project/TEST_MATRIX.md');
const featureDir = path.join(root, 'project/features');

const expectedPublicSources = [
    'src/core/AudioProvider.tsx',
    'src/nodes/Gain.tsx',
    'src/nodes/Filter.tsx',
    'src/nodes/Osc.tsx',
    'src/nodes/Delay.tsx',
    'src/nodes/Compressor.tsx',
    'src/nodes/Convolver.tsx',
    'src/nodes/Panner.tsx',
    'src/nodes/StereoPanner.tsx',
    'src/nodes/WaveShaper.tsx',
    'src/nodes/PresetWaveShaper.tsx',
    'src/nodes/ADSR.tsx',
    'src/transport/TransportContext.tsx',
    'src/sequencer/Sequencer.tsx',
    'src/sequencer/Track.tsx',
    'src/sequencer/EventTrigger.tsx',
    'src/analyzers/Analyzer.tsx',
    'src/sources/Sampler.tsx',
    'src/sources/TriggeredSampler.tsx',
    'src/sources/Noise.tsx',
    'src/sources/NoiseBurst.tsx',
    'src/sources/MediaStream.tsx',
    'src/sources/ConstantSource.tsx',
    'src/sources/LFO.tsx',
    'src/effects/Reverb.tsx',
    'src/effects/Chorus.tsx',
    'src/effects/Distortion.tsx',
    'src/patch/PatchRenderer.tsx',
    'src/midi/MidiProvider.tsx',
    'src/midi/MidiNoteInput.tsx',
    'src/midi/MidiCCInput.tsx',
    'src/midi/MidiNoteOutput.tsx',
    'src/midi/MidiCCOutput.tsx',
    'src/midi/MidiTransportSync.tsx',
];

const expectedNodeSources = fs
    .readdirSync(path.join(root, 'playground/src/playground/nodes'))
    .filter((file) => file.endsWith('.tsx'))
    .map((file) => `playground/src/playground/nodes/${file}`)
    .sort();

const contents = fs.readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(contents);
const matrix = fs.readFileSync(testMatrixPath, 'utf8');
const featureText = fs
    .readdirSync(featureDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => fs.readFileSync(path.join(featureDir, file), 'utf8'))
    .join('\n');

const errors = [];
const itemIds = new Set();
const sources = new Set();

if (!Array.isArray(manifest.items)) {
    errors.push('project/COVERAGE_MANIFEST.json: "items" must be an array');
}

for (const item of manifest.items ?? []) {
    if (itemIds.has(item.id)) {
        errors.push(`Duplicate coverage item id: ${item.id}`);
    }
    itemIds.add(item.id);
    sources.add(item.source);

    const fileChecks = [item.source, item.docs, ...(item.tests ?? [])];
    for (const file of fileChecks) {
        if (!fs.existsSync(path.join(root, file))) {
            errors.push(`${item.id}: missing mapped file ${file}`);
        }
    }

    if (!Array.isArray(item.tests) || item.tests.length === 0) {
        errors.push(`${item.id}: tests must list at least one file`);
    }

    if (!Array.isArray(item.scenarios) || item.scenarios.length === 0) {
        errors.push(`${item.id}: scenarios must list at least one scenario id`);
    } else {
        for (const scenario of item.scenarios) {
            if (!featureText.includes(scenario)) {
                errors.push(`${item.id}: scenario ${scenario} is missing from project/features`);
            }
            if (!matrix.includes(scenario)) {
                errors.push(`${item.id}: scenario ${scenario} is missing from project/TEST_MATRIX.md`);
            }
        }
    }
}

for (const source of [...expectedPublicSources, ...expectedNodeSources]) {
    if (!sources.has(source)) {
        errors.push(`Coverage manifest missing source entry for ${source}`);
    }
}

if (errors.length > 0) {
    console.error('Coverage validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log(`Coverage validation passed for ${manifest.items.length} mapped items.`);
