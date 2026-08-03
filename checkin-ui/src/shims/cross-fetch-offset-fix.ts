/**
 * Vite alias target for `cross-fetch` (used by midnight-js indexer Apollo HttpLink).
 *
 * Preview/Preprod indexers reject empty optional oneOf offsets (`offset: {}`).
 * Coerce those to `null` only when `$offset` is optional.
 *
 * Never touch `$offset: TransactionOffset!` (TX_ID_QUERY) — nulling it causes
 * "Invalid value for argument offset, expected type TransactionOffset".
 */

type FetchArgs = [input: RequestInfo | URL, init?: RequestInit];

function isEmptyPlainObject(value: unknown): boolean {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0;
}

/** True when GraphQL declares a non-null TransactionOffset (must not become null). */
function isRequiredTransactionOffset(query: unknown): boolean {
  return typeof query === 'string' && /\$offset\s*:\s*TransactionOffset\s*!/.test(query);
}

function sanitizeOptionalOffset(offset: unknown): unknown {
  if (offset == null) return null;
  if (typeof offset !== 'object') return offset;
  if (isEmptyPlainObject(offset)) return null;

  const root = { ...(offset as Record<string, unknown>) };

  // ContractActionOffset nesting only — not TransactionOffset { hash | identifier }
  for (const key of ['blockOffset', 'transactionOffset'] as const) {
    const nested = root[key];
    if (nested == null) continue;
    if (isEmptyPlainObject(nested)) {
      delete root[key];
      continue;
    }
    if (typeof nested === 'object') {
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(nested as Record<string, unknown>)) {
        if (v !== undefined && v !== null && !(typeof v === 'object' && isEmptyPlainObject(v))) {
          cleaned[k] = v;
        }
      }
      if (Object.keys(cleaned).length === 0) delete root[key];
      else root[key] = cleaned;
    }
  }

  return Object.keys(root).length === 0 ? null : root;
}

function patchGraphqlBody(body: string): string {
  let parsed: { query?: unknown; variables?: Record<string, unknown>; [k: string]: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return body;
  }
  if (!parsed.variables || !('offset' in parsed.variables)) return body;
  // Leave required TX poll offsets alone (even if empty — surface the real upstream issue)
  if (isRequiredTransactionOffset(parsed.query)) return body;

  parsed.variables = {
    ...parsed.variables,
    offset: sanitizeOptionalOffset(parsed.variables.offset),
  };
  return JSON.stringify(parsed);
}

async function patchedFetch(...args: FetchArgs): Promise<Response> {
  const [input, init] = args;
  if (init?.body && typeof init.body === 'string' && init.body.includes('"offset"')) {
    return fetch(input, { ...init, body: patchGraphqlBody(init.body) });
  }
  return fetch(input, init);
}

export default patchedFetch;
export { patchedFetch as fetch };
export const Headers = globalThis.Headers;
export const Request = globalThis.Request;
export const Response = globalThis.Response;
