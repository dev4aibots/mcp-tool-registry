// PROTOCOL PARITY TESTS for the mcp-tool-registry port.
//
// Part A — the 8-step demo fixture from src/index.ts runDemo(), replayed
// through the browser entry point dispatchJsonRpc(requestJson)->string with
// exact expected responses (the parity oracle).
// Part B — the meaningful assertions of tests/protocol.test.ts, ported to
// dispatchJsonRpc / handleLine / parseRpc / dispatch (same exported API).
//
// Run: npx tsx --test lib/mcp/parity.test.ts
import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { JsonRpcRequest, JsonRpcResponse } from "./types.js";
import {
  CLIENT_CAPABILITIES_KEY,
  CLIENT_INFO_KEY,
  dispatch,
  dispatchJsonRpc,
  demoFixture,
  makeContext,
  makeRequest,
  parseRpc,
  PROTOCOL_VERSION,
  PROTOCOL_VERSION_KEY,
  resetSessionContext,
  SERVER_INFO_KEY,
  SERVER_NAME,
} from "./index.js";
import { TOOL_DESCRIPTORS, makeExecutors, makeIncidents } from "./tools.js";

type Resp = {
  jsonrpc: string;
  id: unknown;
  result?: Record<string, any>;
  error?: { code: number; message: string; data?: unknown };
};

function call(req: JsonRpcRequest): Resp {
  const out = dispatchJsonRpc(JSON.stringify(req));
  assert.ok(out, "dispatchJsonRpc must return a response string");
  const parsed: Resp = JSON.parse(out);
  assert.equal(parsed.jsonrpc, "2.0");
  return parsed;
}

function freshContext() {
  return makeContext(TOOL_DESCRIPTORS, makeExecutors(makeIncidents()));
}

// ---------------------------------------------------------------------------
// Part A: 8-step runDemo() fixture parity
// ---------------------------------------------------------------------------

test("fixture step 1: server/discover returns exact contract", () => {
  resetSessionContext();
  const [req] = demoFixture();
  const resp = call(req!);
  assert.equal(resp.id, 1);
  assert.equal(resp.error, undefined);
  assert.equal(resp.result!.resultType, "complete");
  assert.deepEqual(resp.result!.supportedVersions, ["2026-07-28"]);
  assert.deepEqual(resp.result!.capabilities, { tools: { listChanged: false } });
  assert.equal(
    resp.result!.instructions,
    "Use incident tools to list, inspect, and acknowledge incidents.",
  );
  assert.equal(resp.result!.ttlMs, 3_600_000);
  assert.equal(resp.result!.cacheScope, "public");
  assert.deepEqual(resp.result!._meta, {
    [SERVER_INFO_KEY]: { name: SERVER_NAME, version: "1.0.0" },
  });
});

test("fixture step 2: tools/list returns sorted descriptors", () => {
  resetSessionContext();
  const resp = call(demoFixture()[1]!);
  assert.equal(resp.id, 2);
  assert.equal(resp.result!.resultType, "complete");
  assert.deepEqual(
    resp.result!.tools.map((t: { name: string }) => t.name),
    ["incidents_ack", "incidents_get", "incidents_list"],
  );
  assert.equal(resp.result!.ttlMs, 300_000);
  assert.equal(resp.result!.cacheScope, "public");
});

test("fixture step 3: incidents_list severity=p0 returns only INC-101", () => {
  resetSessionContext();
  const resp = call(demoFixture()[2]!);
  assert.equal(resp.id, 3);
  assert.equal(resp.result!.resultType, "complete");
  assert.equal(resp.result!.isError, false);
  const items = JSON.parse(resp.result!.content[0].text);
  assert.deepEqual(items, [
    { id: "INC-101", severity: "p0", title: "checkout 500s", acked: false },
  ]);
});

test("fixture step 4: incidents_get INC-101 returns unacked incident", () => {
  resetSessionContext();
  const resp = call(demoFixture()[3]!);
  assert.equal(resp.id, 4);
  assert.equal(resp.result!.isError, false);
  assert.deepEqual(JSON.parse(resp.result!.content[0].text), {
    id: "INC-101",
    severity: "p0",
    title: "checkout 500s",
    acked: false,
  });
});

test("fixture step 5: incidents_ack INC-101 returns ack confirmation", () => {
  resetSessionContext();
  const resp = call(demoFixture()[4]!);
  assert.equal(resp.id, 5);
  assert.equal(resp.result!.isError, false);
  assert.deepEqual(JSON.parse(resp.result!.content[0].text), {
    id: "INC-101",
    acked: true,
  });
});

test("fixture steps 5+6 in one session: ack state change visible on follow-up get", () => {
  resetSessionContext();
  const fixture = demoFixture();
  const ack = call(fixture[4]!);
  assert.equal(ack.result!.isError, false);
  const get = call(fixture[5]!); // same session context, ack must persist
  assert.equal(get.id, 6);
  assert.deepEqual(JSON.parse(get.result!.content[0].text), {
    id: "INC-101",
    severity: "p0",
    title: "checkout 500s",
    acked: true,
  });
});

test("fixture step 7: unknown tool returns protocol error -32602", () => {
  resetSessionContext();
  const resp = call(demoFixture()[6]!);
  assert.equal(resp.id, 7);
  assert.equal(resp.result, undefined);
  assert.equal(resp.error!.code, -32602);
  assert.equal(resp.error!.message, "Unknown tool: no_such_tool");
});

test("fixture step 8: future protocol version returns -32022 negotiation data", () => {
  resetSessionContext();
  const resp = call(demoFixture()[7]!);
  assert.equal(resp.id, 8);
  assert.equal(resp.error!.code, -32022);
  assert.equal(resp.error!.message, "Unsupported protocol version");
  assert.deepEqual(resp.error!.data, {
    supported: ["2026-07-28"],
    requested: "2027-01-01",
  });
});

test("fixture: whole 8-step run round-trips as JSON-RPC strings", () => {
  resetSessionContext();
  const replies = demoFixture().map((req) => {
    const s = dispatchJsonRpc(JSON.stringify(req));
    assert.ok(s);
    return JSON.parse(s) as JsonRpcResponse;
  });
  assert.equal(replies.length, 8);
  assert.equal(replies[0]!.id, 1);
  assert.equal(replies[7]!.error!.code, -32022);
});

// ---------------------------------------------------------------------------
// Part B: ported assertions from tests/protocol.test.ts
// ---------------------------------------------------------------------------

test("every request requires params._meta (-32602)", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {},
  });
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("every request requires client capabilities (-32602)", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/list",
    params: { _meta: { [PROTOCOL_VERSION_KEY]: PROTOCOL_VERSION } },
  });
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("unsupported versions return exact -32022 negotiation data", () => {
  const resp = dispatch(freshContext(), makeRequest(4, "tools/list", {}, "2027-01-01"));
  assert.ok(resp);
  assert.equal(resp.error?.code, -32022);
  assert.deepEqual(resp.error?.data, {
    supported: [PROTOCOL_VERSION],
    requested: "2027-01-01",
  });
});

test("missing and non-string protocol versions return -32602 without data", () => {
  const metas: Array<Record<string, unknown>> = [
    { [CLIENT_CAPABILITIES_KEY]: {} },
    { [PROTOCOL_VERSION_KEY]: 20260728, [CLIENT_CAPABILITIES_KEY]: {} },
    { [PROTOCOL_VERSION_KEY]: [PROTOCOL_VERSION], [CLIENT_CAPABILITIES_KEY]: {} },
  ];
  for (const [index, meta] of metas.entries()) {
    const resp = dispatch(freshContext(), {
      jsonrpc: "2.0",
      id: 40 + index,
      method: "tools/list",
      params: { _meta: meta },
    });
    assert.ok(resp);
    assert.equal(resp.error?.code, -32602);
    assert.equal(resp.error?.data, undefined);
  }
});

test("malformed optional clientInfo is rejected (-32602)", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/list",
    params: {
      _meta: {
        [PROTOCOL_VERSION_KEY]: PROTOCOL_VERSION,
        [CLIENT_CAPABILITIES_KEY]: {},
        [CLIENT_INFO_KEY]: { name: "missing-version" },
      },
    },
  });
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("tools/call dispatches to incidents_get with server info", () => {
  const resp = dispatch(
    freshContext(),
    makeRequest(7, "tools/call", {
      name: "incidents_get",
      arguments: { id: "INC-101" },
    }),
  );
  assert.ok(resp);
  const result = resp.result as Record<string, any>;
  assert.equal(result.resultType, "complete");
  assert.equal(result.isError, false);
  assert.equal(result._meta[SERVER_INFO_KEY]?.version, "1.0.0");
  assert.ok((result.content[0]?.text ?? "").includes("INC-101"));
});

test("tools/call unknown tool returns -32602 with Unknown tool message", () => {
  const resp = dispatch(
    freshContext(),
    makeRequest(8, "tools/call", { name: "nope", arguments: {} }),
  );
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
  assert.match(resp.error?.message ?? "", /Unknown tool/);
});

test("tools/call rejects a malformed tool name (-32602)", () => {
  const resp = dispatch(
    freshContext(),
    makeRequest(9, "tools/call", { name: "", arguments: {} }),
  );
  assert.ok(resp);
  assert.equal(resp.error?.code, -32602);
});

test("known tools enforce every advertised input schema as complete tool errors", () => {
  const cases = [
    { name: "incidents_list", arguments: { severity: "p3" } },
    { name: "incidents_get", arguments: {} },
    { name: "incidents_ack", arguments: { id: 101 } },
    { name: "incidents_list", arguments: { extra: true } },
    { name: "incidents_get", arguments: [] },
  ];
  for (const [index, params] of cases.entries()) {
    const resp = dispatch(freshContext(), makeRequest(50 + index, "tools/call", params));
    assert.ok(resp);
    assert.equal(resp.error, undefined);
    const result = resp.result as Record<string, any>;
    assert.equal(result.resultType, "complete");
    assert.equal(result.isError, true);
    assert.match(result.content[0]?.text ?? "", /Invalid arguments/);
  }
});

test("requests never inherit metadata from a prior call", () => {
  const context = freshContext();
  assert.ok(dispatch(context, makeRequest(12, "tools/list"))?.result);
  const missingMeta = dispatch(context, {
    jsonrpc: "2.0",
    id: 13,
    method: "tools/list",
    params: {},
  });
  assert.equal(missingMeta?.error?.code, -32602);
});

test("JSON-RPC notifications return no response", () => {
  const resp = dispatch(freshContext(), {
    jsonrpc: "2.0",
    method: "notifications/tools/list_changed",
  });
  assert.equal(resp, null);
});

test("legacy lifecycle methods are not implemented (-32601)", () => {
  const initialize = dispatch(freshContext(), makeRequest(14, "initialize"));
  const shutdown = dispatch(freshContext(), makeRequest(15, "shutdown"));
  assert.equal(initialize?.error?.code, -32601);
  assert.equal(shutdown?.error?.code, -32601);
});

test("unknown modern method returns -32601", () => {
  const resp = dispatch(freshContext(), makeRequest(16, "no/such"));
  assert.ok(resp);
  assert.equal(resp.error?.code, -32601);
});

test("parseRpc rejects malformed JSON", () => {
  const r = parseRpc("not json");
  assert.equal(r.ok, false);
});

test("dispatchJsonRpc emits -32700 envelope on parse failure (was processLine)", () => {
  resetSessionContext();
  const out = dispatchJsonRpc("not json");
  assert.ok(out);
  const parsed = JSON.parse(out) as { error?: { code: number; message: string } };
  assert.equal(parsed.error?.code, -32700);
  assert.equal(parsed.error?.message, "Parse error");
});

test("dispatchJsonRpc emits -32600 Invalid Request envelope on bad envelope", () => {
  resetSessionContext();
  const out = dispatchJsonRpc('{"jsonrpc":"2.0","id":null,"method":"tools/list"}');
  const parsed = JSON.parse(out) as { error?: { code: number; message: string } };
  assert.equal(parsed.error?.code, -32600);
  assert.equal(parsed.error?.message, "Invalid Request");
});

test("parseRpc rejects a null MCP request id", () => {
  const result = parseRpc('{"jsonrpc":"2.0","id":null,"method":"tools/list"}');
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, -32600);
});

test("blank input yields empty string (no response written, like serveStdio)", () => {
  resetSessionContext();
  assert.equal(dispatchJsonRpc("   "), "");
});
