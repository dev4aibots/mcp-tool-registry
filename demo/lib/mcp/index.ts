// Ported from dev4aibots/mcp-tool-registry src/index.ts (sha ddf5f83).
// The demo FIXTURE is verbatim (the parity oracle). serveStdio/stdout printing
// from main() is not ported — the browser entry point is dispatchJsonRpc in
// ./transport.js (see PROTOCOL_PARITY.md).
import type { JsonRpcRequest } from "./types.js";
import { makeRequest } from "./protocol.js";

export function demoFixture(): JsonRpcRequest[] {
  return [
    makeRequest(1, "server/discover"),
    makeRequest(2, "tools/list"),
    makeRequest(3, "tools/call", {
      name: "incidents_list",
      arguments: { severity: "p0" },
    }),
    makeRequest(4, "tools/call", {
      name: "incidents_get",
      arguments: { id: "INC-101" },
    }),
    makeRequest(5, "tools/call", {
      name: "incidents_ack",
      arguments: { id: "INC-101" },
    }),
    makeRequest(6, "tools/call", {
      name: "incidents_get",
      arguments: { id: "INC-101" },
    }),
    makeRequest(7, "tools/call", { name: "no_such_tool", arguments: {} }),
    makeRequest(8, "tools/list", {}, "2027-01-01"),
  ];
}

export * from "./protocol.js";
export * from "./tools.js";
export * from "./transport.js";
export type * from "./types.js";
