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
      '@contract': path.resolve(__dirname, '..', 'contracts', 'managed', 'event-checkin'),
      'object-inspect': path.resolve(__dirname, 'src/shims/object-inspect.js'),
      'vite-plugin-node-polyfills/shims/buffer': path.resolve(
        __dirname,
        'node_modules/vite-plugin-node-polyfills/shims/buffer/dist/index.js',
      ),
      'vite-plugin-node-polyfills/shims/global': path.resolve(
        __dirname,
        'node_modules/vite-plugin-node-polyfills/shims/global/dist/index.js',
      ),
      'vite-plugin-node-polyfills/shims/process': path.resolve(
        __dirname,
        'node_modules/vite-plugin-node-polyfills/shims/process/dist/index.js',
      ),
    },
  },
  optimizeDeps: {
    exclude: ['@midnight-ntwrk/compact-runtime'],
  },
  server: {
    port: 5173,
  },
});
