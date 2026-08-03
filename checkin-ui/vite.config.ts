import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({ include: ['buffer', 'process', 'util', 'stream', 'events'] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@contract': path.resolve(__dirname, '..', 'contract', 'src', 'managed', 'event-checkin'),
      'object-inspect': path.resolve(__dirname, 'src/shims/object-inspect.js'),
      // midnight-js indexer Apollo HttpLink uses cross-fetch; coerce empty oneOf offsets
      'cross-fetch': path.resolve(__dirname, 'src/shims/cross-fetch-offset-fix.ts'),
    },
    dedupe: [
      '@midnight-ntwrk/compact-runtime',
      '@midnight-ntwrk/midnight-js-protocol',
      '@midnight-ntwrk/midnight-js-contracts',
    ],
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    target: 'esnext',
  },
  server: {
    port: 5173,
    proxy: {
      '/proof-server': {
        target: 'https://proof-server.preview.midnight.network',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/proof-server/, ''),
      },
    },
  },
});
