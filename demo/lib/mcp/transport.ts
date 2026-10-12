// Browser-safe replacement for src/transport.ts (dev4aibots/mcp-tool-registry, sha 93f8534).
//
// ONLY the stdio half is replaced. `node:readline` / stdin / stdout are gone.
// `processLine`'s line-handling logic is preserved verbatim as `handleLine`:
// same parseRpc/dispatch path, same error envelopes, same JSON.stringify output.
//
// `dispatchJsonRpc(requestJson)` is the public entry point: it takes a raw
// JSON-RPC request string and returns the verbatim JSON-RPC response string,
// running against a session-scoped server context (mirroring serveStdio,
// which created ONE context for the whole session — so an incidents_ack
// persists and is visible on a later incidents_get, exactly as in runDemo).
// Notifications (no id) produce no response; dispatchJsonRpc returns "" for
// them, matching the original behaviour of writing nothing.
import type { JsonRpcResponse } from "./types.js";
import {
  dispatch,
  makeContext,
  parseRpc,
  type ServerContext,
} from "./protocol.js";
import { TOOL_DESCRIPTORS, makeExecutors, makeIncidents } from "./tools.js";

export function handleLine(context: ServerContext, line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const parsed = parseRpc(trimmed);
  if (!parsed.ok) {
    const message = parsed.code === -32600 ? "Invalid Request" : "Parse error";
    const err: JsonRpcResponse = {
      jsonrpc: "2.0",
      id: null,
      error: { code: parsed.code, message, data: parsed.err },
    };
    return JSON.stringify(err);
  }
  const resp = dispatch(context, parsed.msg);
  if (resp) return JSON.stringify(resp);
  return null;
}

/** Fresh server context, same composition as src/index.ts main()/runDemo(). */
export function makeDemoContext(): ServerContext {
  return makeContext(TOOL_DESCRIPTORS, makeExecutors(makeIncidents()));
}

let sessionContext: ServerContext | null = null;

/** The context `dispatchJsonRpc` runs against. Lazily created, session-scoped. */
export function getSessionContext(): ServerContext {
  if (!sessionContext) sessionContext = makeDemoContext();
  return sessionContext;
}

/** Reset the session context (fresh incident store) — used by tests. */
export function resetSessionContext(): ServerContext {
  sessionContext = makeDemoContext();
  return sessionContext;
}

/**
 * Take a raw JSON-RPC request string, return the verbatim JSON-RPC response
 * string, using the same parseRpc/dispatch path as serveStdio/processLine.
 * Returns "" for blank lines and for notifications (no response defined).
 */
export function dispatchJsonRpc(requestJson: string): string {
  return handleLine(getSessionContext(), requestJson) ?? "";
}
