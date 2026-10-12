import { NextResponse } from 'next/server';
import { dispatchJsonRpc } from '@/lib/mcp/transport.js';

/**
 * POST a raw JSON-RPC request string; the response string is the verbatim
 * output of dispatchJsonRpc — the exact same code path the browser views use
 * in-process. The server-side context is per server process (session-scoped,
 * mirroring serveStdio's single session context).
 */
export async function POST(request: Request) {
  const body = await request.text();
  const out = dispatchJsonRpc(body);
  if (out === '') {
    // Notifications (no id) produce no response — the original wrote nothing.
    return new NextResponse(null, { status: 204 });
  }
  return new NextResponse(out, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
