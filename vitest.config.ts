import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
    resolve: {
        alias: {
            '@din/react': resolve(__dirname, 'src/index.ts'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.spec.ts', 'tests/**/*.spec.tsx'],
        setupFiles: ['./vitest.setup.ts'],
    },
});
