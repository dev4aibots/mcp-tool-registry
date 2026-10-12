// Shared client/server helpers that call the REAL ported MCP core in lib/mcp.
// Every view uses these — nothing is mocked. The single entry point is
// dispatchJsonRpc(requestJson) from lib/mcp/transport.js.
import { dispatchJsonRpc } from '@/lib/mcp/transport.js';
import { makeRequest, requestMeta, PROTOCOL_VERSION } from '@/lib/mcp/protocol.js';
import type { JsonRpcRequest } from '@/lib/mcp/types.js';

export { PROTOCOL_VERSION };

/** Build a protocol-correct JSON-RPC request string with the required _meta. */
export function buildRequest(
  id: number | string,
  method: string,
  params: Record<string, unknown> = {},
  version: string = PROTOCOL_VERSION,
): string {
  const req: JsonRpcRequest = makeRequest(id, method, params, version);
  return JSON.stringify(req);
}

/** Build a raw request string without the _meta wrapper (for negative tests). */
export function buildRawRequest(
  id: number | string,
  method: string,
  params: Record<string, unknown> = {},
): string {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params });
}

export type RpcCall = {
  requestJson: string;
  responseJson: string;
  latencyMs: number;
  parsed: unknown;
  isErrorEnvelope: boolean;
  errorCode: number | null;
  isToolError: boolean;
};

/** Run a raw JSON-RPC request string through the real server core, in-process. */
export function callLocal(requestJson: string): RpcCall {
  const start = performance.now();
  const responseJson = dispatchJsonRpc(requestJson);
  const latencyMs = Math.max(0, Math.round((performance.now() - start) * 10) / 10);
  return annotate(requestJson, responseJson, latencyMs);
}

/** Round-trip over HTTP to /api/rpc — same dispatchJsonRpc code path, server-side. */
export async function callHttp(requestJson: string): Promise<RpcCall> {
  const start = performance.now();
  const res = await fetch('/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: requestJson,
  });
  const responseJson = await res.text();
  const latencyMs = Math.max(0, Math.round((performance.now() - start) * 10) / 10);
  return annotate(requestJson, responseJson, latencyMs);
}

function annotate(requestJson: string, responseJson: string, latencyMs: number): RpcCall {
  let parsed: unknown = null;
  let isErrorEnvelope = false;
  let errorCode: number | null = null;
  let isToolError = false;
  try {
    parsed = JSON.parse(responseJson);
  } catch {
    parsed = null;
  }
  if (parsed && typeof parsed === 'object' && 'error' in parsed) {
    isErrorEnvelope = true;
    const err = (parsed as { error?: { code?: unknown } }).error;
    errorCode = typeof err?.code === 'number' ? err.code : null;
  }
  if (
    parsed &&
    typeof parsed === 'object' &&
    'result' in parsed &&
    (parsed as { result?: { isError?: unknown } }).result?.isError === true
  ) {
    isToolError = true;
  }
  return { requestJson, responseJson, latencyMs, parsed, isErrorEnvelope, errorCode, isToolError };
}

/** Extract the text of the first content block from a tools/call result. */
export function firstContentText(responseJson: string): string | null {
  try {
    const parsed = JSON.parse(responseJson) as {
      result?: { content?: Array<{ type?: string; text?: string }> };
    };
    const block = parsed.result?.content?.[0];
    return block?.type === 'text' ? (block.text ?? null) : null;
  } catch {
    return null;
  }
}

/** Parse that content text as an incident (or incident list). */
export function contentJson<T>(responseJson: string): T | null {
  const text = firstContentText(responseJson);
  if (text === null) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export { requestMeta };
