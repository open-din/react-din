import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'project/COVERAGE_MANIFEST.json'), 'utf8'));
const manifestBySource = new Map(manifest.items.map((item) => [item.source, item]));

const ignoredComponentFiles = new Set([
    'src/core/index.ts',
    'src/core/types.ts',
    'src/core/useAudio.ts',
    'src/core/AudioOutContext.tsx',
    'src/core/ModulatableValue.ts',
    'src/core/unlock.ts',
    'src/nodes/index.ts',
    'src/nodes/types.ts',
    'src/nodes/useAudioNode.ts',
    'src/transport/index.ts',
    'src/transport/types.ts',
    'src/transport/useBeat.ts',
    'src/transport/useTransport.ts',
    'src/sequencer/index.ts',
    'src/sequencer/types.ts',
    'src/sequencer/useTrigger.ts',
    'src/sequencer/TriggerContext.tsx',
    'src/analyzers/index.ts',
    'src/analyzers/types.ts',
    'src/analyzers/useAnalyzer.ts',
    'src/analyzers/useFFT.ts',
    'src/analyzers/useLevels.ts',
    'src/analyzers/useMeter.ts',
    'src/analyzers/useWaveform.ts',
    'src/sources/index.ts',
    'src/sources/types.ts',
    'src/sources/useLFO.ts',
    'src/effects/index.ts',
    'src/effects/types.ts',
    'src/midi/index.ts',
    'src/midi/types.ts',
    'src/midi/runtime.ts',
    'src/midi/useMidi.ts',
]);

const parseDiff = () => {
    const base = process.env.VALIDATE_CHANGES_BASE;
    const head = process.env.VALIDATE_CHANGES_HEAD;
    const args = ['diff', '--name-status', '--diff-filter=ACMR'];

    if (base && head) {
        try {
            execFileSync('git', ['rev-parse', '--verify', base], { cwd: root, stdio: 'ignore' });
            execFileSync('git', ['rev-parse', '--verify', head], { cwd: root, stdio: 'ignore' });
            args.push(base, head);
        } catch {
            args.push('HEAD');
        }
    } else {
        args.push('HEAD');
    }

    const output = execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
    if (!output) return [];

    return output.split('\n').map((line) => {
        const [status, ...rest] = line.trim().split(/\s+/);
        return {
            status,
            path: rest.at(-1),
        };
    });
};

const isPotentialPublicComponent = (file) => {
    if (!file.startsWith('src/')) return false;
    if (!file.endsWith('.tsx')) return false;
    if (ignoredComponentFiles.has(file)) return false;
    const base = path.basename(file);
    return /^[A-Z]/.test(base);
};

const diffEntries = parseDiff();
const changedFiles = new Set(diffEntries.map((entry) => entry.path));
const errors = [];

for (const entry of diffEntries) {
    const manifestItem = manifestBySource.get(entry.path);
    if (manifestItem) {
        const docsChanged = changedFiles.has(manifestItem.docs);
        const testsChanged = manifestItem.tests.some((testFile) => changedFiles.has(testFile));

        if (!docsChanged || !testsChanged) {
            errors.push(
                `${entry.path}: source changes must include ${manifestItem.docs} and at least one mapped test file`
            );
        }
        continue;
    }

    if (entry.path?.startsWith('playground/src/playground/nodes/') && entry.path.endsWith('.tsx')) {
        errors.push(
            `${entry.path}: playground node changes must be added to project/COVERAGE_MANIFEST.json and update docs/tests`
        );

        if (entry.status.startsWith('A')) {
            const baseName = path.basename(entry.path, '.tsx');
            const expectedDocs = `docs/playground-nodes/${baseName}.md`;
            const requiredFiles = [
                'playground/src/playground/nodes/index.ts',
                'playground/src/PlaygroundDemo.tsx',
                'playground/src/playground/store.ts',
                'playground/src/playground/AudioEngine.ts',
                'playground/src/playground/CodeGenerator.tsx',
                'project/COVERAGE_MANIFEST.json',
                expectedDocs,
            ];

            for (const required of requiredFiles) {
                if (!changedFiles.has(required)) {
                    errors.push(`${entry.path}: new playground nodes must also change ${required}`);
                }
            }
        }
    } else if (isPotentialPublicComponent(entry.path)) {
        errors.push(
            `${entry.path}: public component changes must be added to project/COVERAGE_MANIFEST.json and update docs/tests`
        );

        if (entry.status.startsWith('A')) {
            const componentName = path.basename(entry.path, path.extname(entry.path));
            const expectedDocs = `docs/components/${path.basename(path.dirname(entry.path))}/${componentName}.md`;
            const requiredFiles = ['src/index.ts', 'project/COVERAGE_MANIFEST.json', expectedDocs];

            for (const required of requiredFiles) {
                if (!changedFiles.has(required)) {
                    errors.push(`${entry.path}: new public components must also change ${required}`);
                }
            }
        }
    }
}

if (errors.length > 0) {
    console.error('Change validation failed:');
    errors.forEach((error) => console.error(`- ${error}`));
    process.exit(1);
}

console.log('Change validation passed.');
