import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    root: __dirname,
    resolve: {
        alias: {
            '@din/react': resolve(__dirname, '../src/index.ts'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/unit/**/*.spec.ts', 'tests/unit/**/*.spec.tsx'],
        setupFiles: [resolve(__dirname, './vitest.setup.ts')],
    },
});
