import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    root: __dirname,
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/**/*.spec.ts'],
    },
});
