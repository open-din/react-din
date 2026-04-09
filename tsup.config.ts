import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        'core/index': 'src/core/index.ts',
        'nodes/index': 'src/nodes/index.ts',
        'transport/index': 'src/transport/index.ts',
        'sequencer/index': 'src/sequencer/index.ts',
        'analyzers/index': 'src/analyzers/index.ts',
        'sources/index': 'src/sources/index.ts',
        'effects/index': 'src/effects/index.ts',
        'midi/index': 'src/midi/index.ts',
        'data/index': 'src/data/index.ts',
        'patch/index': 'src/patch/index.ts',
        'routing/index': 'src/routing/index.ts',
        'notes/index': 'src/notes/index.ts',
        'synths/index': 'src/synths/index.ts',
        'utils/index': 'src/utils/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    splitting: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ['react', 'react-dom', 'din-wasm'],
    esbuildOptions(options) {
        options.jsx = 'automatic';
    },
});
