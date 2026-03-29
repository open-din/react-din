import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import autoprefixer from 'autoprefixer';
import tailwindcss from 'tailwindcss';

const rootDirectory = dirname(fileURLToPath(import.meta.url));

export default {
  plugins: [
    tailwindcss({
      config: resolve(rootDirectory, 'tailwind.config.js'),
    }),
    autoprefixer(),
  ],
};
