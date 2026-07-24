import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Midnight's compiled contract + wallet SDK are WASM-backed and expect a few
// Node globals (Buffer, process). The plugins below make that work in the
// browser bundle. `@contract` points at the Compact `managed/` output so the
// UI can import the generated `Contract` class and `ledger` decoder.
export default defineConfig({
  plugins: [
    react(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({ include: ['buffer', 'process', 'util', 'stream', 'events'] }),
  ],
  resolve: {
    alias: {
      '@contract': path.resolve(__dirname, '..', 'contracts', 'managed', 'event-checkin'),
      // `@midnight-ntwrk/compact-runtime` is hoisted to the repo-root
      // `node_modules`, so when vite-plugin-node-polyfills rewrites its
      // `Buffer`/`process` usage to these shims, Rollup cannot resolve the bare
      // specifiers from that location during `vite build`. Pin them to the
      // absolute shim paths inside the frontend workspace.
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
    // WASM-backed packages should not be pre-bundled by esbuild.
    exclude: ['@midnight-ntwrk/compact-runtime'],
  },
  server: {
    port: 5173,
  },
});
