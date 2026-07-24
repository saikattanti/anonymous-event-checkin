// Minimal ESM shim for the CommonJS `object-inspect` package.
// `@midnight-ntwrk/compact-runtime` imports it as a default export for error
// formatting; Vite otherwise serves the raw CJS file and the page crashes with:
//   SyntaxError: does not provide an export named 'default'
export default function inspect(value, _opts) {
  try {
    if (typeof value === 'string') return JSON.stringify(value);
    return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2);
  } catch {
    return String(value);
  }
}
