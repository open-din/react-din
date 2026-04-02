import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDirectory = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(rootDirectory, 'ui/**/*.{ts,tsx}'),
    resolve(rootDirectory, 'bridge/**/*.{ts,tsx}'),
    resolve(rootDirectory, 'targets/web/index.html'),
    resolve(rootDirectory, 'targets/app/index.html'),
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
