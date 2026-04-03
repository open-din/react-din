import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

export default defineConfig({
    root: __dirname,
    publicDir: path.resolve(__dirname, '../../public'),
    plugins: [react()],
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
    server: {
        host: 'localhost',
        port: 5173,
    },
    build: {
        outDir: path.resolve(__dirname, '../../dist/web'),
        emptyOutDir: true,
    },
});
