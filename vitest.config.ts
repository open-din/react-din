import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    resolve: {
        alias: [
            { find: '@din/vanilla/core', replacement: resolve(__dirname, 'packages/vanilla/src/core/index.ts') },
            { find: '@din/vanilla', replacement: resolve(__dirname, 'packages/vanilla/src/index.ts') },
            { find: '@din/react/midi', replacement: resolve(__dirname, 'packages/react/src/midi/index.ts') },
            { find: '@din/react', replacement: resolve(__dirname, 'packages/react/src/index.ts') },
            { find: 'react-din', replacement: resolve(__dirname, 'packages/react-din/src/index.ts') },
        ],
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
        setupFiles: ['./vitest.setup.ts'],
    },
});
