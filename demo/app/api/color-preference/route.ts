import { NextResponse } from 'next/server';

/** Persist the color preference cookie so SSR matches first paint on reloads. */
export async function POST(request: Request) {
  let colorMode: string | undefined;
  try {
    const body = (await request.json()) as { colorMode?: string };
    colorMode = body.colorMode;
  } catch {
    colorMode = undefined;
  }
  if (colorMode !== 'light' && colorMode !== 'dark') {
    return NextResponse.json({ error: 'colorMode must be "light" or "dark"' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('color-preference', colorMode, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return res;
}
