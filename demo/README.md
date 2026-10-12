# mcp-tool-registry-demo

A live, browser-run demo of the **MCP tool registry protocol core** from
[`dev4aibots/mcp-tool-registry`](https://github.com/dev4aibots/mcp-tool-registry),
dressed in GitHub-exact Primer UI. Every view dispatches against the real,
faithfully ported protocol code — nothing is mocked.

## What the demo is

Five views, all wired to the real `lib/mcp` core through its single entry
point `dispatchJsonRpc(requestJson: string): string`:

| Route | View | Real call |
|---|---|---|
| `/tools` | Tool registry — DataTable of the 3 tools, expandable JSON schemas | `tools/list` |
| `/incidents` | Incident dashboard — search, severity/status filters, StateLabel pills | `tools/call` → `incidents_list` |
| `/incidents/[id]` | Incident detail — live record, activity Timeline, acknowledge flow | `incidents_get`, then `incidents_ack` behind a ConfirmationDialog |
| `/console` | JSON-RPC console — raw request editor, verbatim request/response, 8-step demo trace | any method, via `dispatchJsonRpc` |
| `/errors` | Error showcase — one-click failure modes with exact envelopes | `tools/call` with bad inputs |

Global chrome reads as `github.com/dev4aibots/mcp-tool-registry`: Primer
`Header`, repo `Breadcrumbs` + `BranchName`, `UnderlineNav` tabs, dark/light
toggle, thin footer.

## How to run

```bash
npm install
npm run dev      # serves at http://localhost:3000
npm run build    # production build (must exit 0)
npm test         # 27/27 protocol parity tests against the original stdio behavior
```

## Architecture

```
browser (React client components)
  │  dispatchJsonRpc(rawJson) — in-process, same parseRpc/dispatch path
  ▼  as the original serveStdio/processLine
lib/mcp/  (protocol.ts, tools.ts, transport.ts, types.ts — ported verbatim
           except the stdio half, which dispatchJsonRpc replaces)

optional HTTP path:
browser ──POST /api/rpc──▶ app/api/rpc/route.ts ──▶ dispatchJsonRpc
                                                  (server-side session context)
```

The console lets you choose the transport per request; the status line labels
each response `browser` or `http`. Both run the identical code path — the only
difference is whose session store backs it (see honest notes).

UI stack: Next.js 14 (App Router) + React 18.3 +
`@primer/react@38.40.1` + `@primer/primitives@11.10.0` + `@primer/css@22.3.2` +
`@primer/octicons-react@19.40.0` (all pinned, MIT). Light/dark via
`data-color-mode` on `<html>` with a `color-preference` cookie (SSR-first, no
theme flash). See `DESIGN.md` and `design-primer.md` for the token rules.

## Honest notes

- **Session-scoped ack state.** `incidents_ack` mutates the session context —
  the same single-context-per-session semantics as the original stdio server.
  In the browser the context is module-scoped per tab: acks persist across
  in-app navigation, but a full page reload resets the store to the pristine
  fixture (INC-101 p0 open, INC-102 p2 acked, INC-103 p1 open). The HTTP path
  uses a separate server-side session context (per server process).
- **stdio → dispatchJsonRpc adaptation.** The original server spoke over
  stdin/stdout; the port replaces only that transport half. `handleLine`
  preserves `processLine`'s logic verbatim: `-32700` parse envelopes with
  `id: null`, notifications (no `id`) produce no response, `dispatch` is
  untouched.
- **Schema violations are tool results, not JSON-RPC errors.** Invalid
  arguments and executor throws (e.g. unknown incident id) return a `result`
  envelope with `isError: true` content blocks — exactly what the real
  protocol does. The error showcase labels these honestly.
- **The fixture has no timestamps**, so the dashboard has no "age" column —
  inventing one would be fake data. Severity/status/search/filter are all
  derived from the real incident records.
- **Primer v38 API realities** (verified against the installed package, not
  docs): `Box` no longer exists and the `sx` prop was removed wholesale — the
  app uses `Stack`, `className`, and token-based utility classes in
  `app/global.css` instead. `DataTable`, `Blankslate`, `PageHeader`, `Dialog`
  come from `@primer/react/experimental`; `SplitPageLayout` is root-stable.
