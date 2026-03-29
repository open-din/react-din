import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    root: __dirname,
    resolve: {
        alias: {
            '@din/react': resolve(__dirname, '../../../src/index.ts'),
        },
    },
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/**/*.spec.ts'],
    },
});
