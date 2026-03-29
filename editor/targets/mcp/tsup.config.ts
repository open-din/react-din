import { defineConfig } from 'tsup';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    entry: [resolve(rootDirectory, 'src/index.ts')],
    tsconfig: resolve(rootDirectory, 'tsconfig.json'),
    format: ['cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'node',
    target: 'es2022',
    external: [],
    noExternal: ['ws'],
    outDir: resolve(rootDirectory, 'dist'),
    outExtension() {
        return {
            js: '.cjs',
        };
    },
    esbuildOptions(options) {
        options.jsx = 'automatic';
    },
});
