// Copies the compiled Compact contract's zk assets into the frontend's
// public/ dir so the dev/build server can serve them to FetchZkConfigProvider
// at `/managed/event-checkin/...`. Run automatically before `dev` and `build`.
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(__dirname, '..', '..', 'contract', 'src', 'managed', 'event-checkin');
const dest = path.resolve(__dirname, '..', 'public', 'managed', 'event-checkin');

if (!fs.existsSync(src)) {
  console.warn(
    `[copy-contract-assets] Compiled contract not found at ${src}.\n` +
      '  Run `npm run compile` in the project root first. Skipping for now.',
  );
  process.exit(0);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`[copy-contract-assets] Copied ${src} -> ${dest}`);
