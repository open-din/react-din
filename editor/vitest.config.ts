import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    resolve: {
        alias: [
            { find: /.*\/AudioEngine$/, replacement: resolve(__dirname, './ui/editor/AudioEngine.stub.ts') },
            { find: '@din/react', replacement: resolve(__dirname, '../src/index.ts') },
        ],
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['editor/tests/unit/**/*.spec.ts', 'editor/tests/unit/**/*.spec.tsx'],
        setupFiles: [resolve(__dirname, './vitest.setup.ts')],
    },
});
