# PROTOCOL_PARITY.md — mcp-tool-registry port

Source: `dev4aibots/mcp-tool-registry` (commit f445f4f, read-only via github CLI).
Target: `~/workspace/demos/mcp-tool-registry-demo/lib/mcp/` — framework-free
TypeScript, importable from a browser/Next.js client with zero config.

## What was ported (behavior byte-for-byte)

| File | Source | Notes |
|---|---|---|
| `types.ts` | `src/types.ts` (sha d0f0cee) | Verbatim: JsonRpc envelopes, JsonSchema, ToolDescriptor, Incident, ToolExecutor |
| `protocol.ts` | `src/protocol.ts` (sha 4b514ae) | Verbatim: constants, `RpcProblem`, `isRecord`, hand-rolled `validateSchema` (object/enum/string/additionalProperties), `requestMeta`, `makeRequest`, `complete`, `validateRequest`, all three method handlers, `dispatch`, `parseRpc` |
| `tools.ts` | `src/tools.ts` (sha c930226) | Verbatim: `makeIncidents()` fixture data (INC-101 p0 "checkout 500s" acked:false, INC-102 p2 "slow dashboard" acked:true, INC-103 p1 "rate-limit storm" acked:false), the 3 `TOOL_DESCRIPTORS` with exact JSON schemas (strict: `additionalProperties: false`, enum `["p0","p1","p2"]`, required `["id"]`), and all 3 executors (`execList`/`execGet`/`execAck` incl. mutating ack and `throw new Error("not found: <id>")`) |
| `index.ts` | `src/index.ts` (sha ddf5f83) | `demoFixture()` ported verbatim — the same 8 `makeRequest(...)` calls (same ids, same methods, same args, same `"2027-01-01"` future version on step 8). `main()`'s stdout printing and `--serve` flag were not ported (console/demo-runner concerns, see below) |

Semantics preserved: `server/discover` → `supportedVersions: ["2026-07-28"]`,
`capabilities: {tools:{listChanged:false}}`, ttlMs 3_600_000, cacheScope "public";
`tools/list` → sorted descriptors, ttlMs 300_000; `tools/call` → schema
violations return `complete()` tool-error results (not JSON-RPC errors), executor
throws become `isError: true` results. Error codes/messages exact:
-32700 parse, -32600 invalid request, -32601 method not found,
-32602 invalid params / unknown tool / meta violations, -32022 unsupported
protocol version (with `{supported, requested}` data), -32603 internal.

## What was REPLACED (only the stdio transport)

`src/transport.ts` (sha 93f8534) used `node:readline` + stdin/stdout — not
available in a browser. Replaced with:

- `handleLine(context, line): string | null` — `processLine`'s logic preserved
  exactly (trim, `parseRpc`, error envelopes: `-32700 → "Parse error"`,
  `-32600 → "Invalid Request"`, `id: null` + `data: parsed.err`;
  `dispatch` result stringified; `null` when no response).
- `dispatchJsonRpc(requestJson: string): string` — takes a raw JSON-RPC request
  string, returns the verbatim JSON-RPC response string through the same
  parseRpc/dispatch path. Runs on a session-scoped singleton context
  (`getSessionContext()` / `resetSessionContext()`), mirroring `serveStdio`,
  which created ONE context for the whole session — so an `incidents_ack`
  persists and is visible on a later `incidents_get` (steps 5→6 of the fixture).
- Blank lines and JSON-RPC notifications (no `id`) return `""` — matching the
  original, which wrote nothing for them.

`replayFixture` was not ported — tests drive `dispatchJsonRpc` directly, which
is the stronger check (string in/out, exact wire format).

## Honest deviations from README claims (ignored per brief)

- README claims Hono / Vercel-Edge / JWT-auth / benchmarks: none of these
  exist in `src/` — they were NOT ported (there is nothing to port).
- `.env.example` keys are vestigial: no code in `src/` reads env; the port
  needs zero config, zero credentials.
- `package.json` lists `zod` as a dependency, but `src/` never imports it —
  validation is the hand-rolled `validateSchema` in `protocol.ts`. The port
  therefore does NOT depend on zod (same behavior, no extra dependency).

## Test results (2026-10-12)

`npx tsc --noEmit` → clean.
`npx tsx --test lib/mcp/parity.test.ts` → **27 tests, 27 pass, 0 fail**.

Part A (8-step fixture through `dispatchJsonRpc`): discover contract exact
(supportedVersions, capabilities, instructions, ttlMs, cacheScope, serverInfo
_meta); tools/list sorted `[incidents_ack, incidents_get, incidents_list]`;
list p0 → only INC-101; get INC-101 acked:false; ack → `{id, acked:true}`;
follow-up get in the same session shows acked:true; unknown tool →
`-32602 "Unknown tool: no_such_tool"`; future version →
`-32022 "Unsupported protocol version"` with exact negotiation data
`{supported:["2026-07-28"], requested:"2027-01-01"}`.

Part B (ported `tests/protocol.test.ts` assertions, all 21 originals): meta
validation, client-capabilities requirement, clientInfo malformation, schema
enforcement as tool errors (5 cases incl. extra-property and array-args),
ack state flip, no metadata inheritance, notifications → null, legacy
methods → -32601, parseRpc rejections, and the `processLine` → `-32700`
envelope test rewritten against `dispatchJsonRpc`.
