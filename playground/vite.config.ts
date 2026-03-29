import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: [
      { find: 'react', replacement: path.resolve(__dirname, '../node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, '../node_modules/react-dom') },
      { find: '@din/vanilla/core', replacement: path.resolve(__dirname, '../packages/vanilla/src/core/index.ts') },
      { find: '@din/vanilla', replacement: path.resolve(__dirname, '../packages/vanilla/src/index.ts') },
      { find: '@din/react/midi', replacement: path.resolve(__dirname, '../packages/react/src/midi/index.ts') },
      { find: '@din/react', replacement: path.resolve(__dirname, '../packages/react/src/index.ts') },
      { find: 'react-din', replacement: path.resolve(__dirname, '../packages/react-din/src/index.ts') },
    ]
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
