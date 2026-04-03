import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

export default defineConfig({
    root: __dirname,
    plugins: [react()],
    publicDir: false,
    css: {
        postcss: {
            plugins: [
                tailwindcss({
                    config: path.resolve(__dirname, '../../tailwind.config.js'),
                }),
                autoprefixer(),
            ],
        },
    },
    resolve: {
        dedupe: ['react', 'react-dom'],
        alias: {
            react: path.resolve(__dirname, '../../../node_modules/react'),
            'react-dom': path.resolve(__dirname, '../../../node_modules/react-dom'),
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom'],
    },
    build: {
        outDir: path.resolve(__dirname, '../../dist/app/renderer'),
        emptyOutDir: true,
    },
});
