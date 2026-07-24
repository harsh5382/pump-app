import { NextResponse } from "next/server";

// ───────────────────────────────────────────────────────────────────────────
// Legacy session endpoint.
//
// Under Firebase this exchanged an ID token for an httpOnly session cookie.
// With Supabase, the browser client manages the auth cookies directly and the
// middleware refreshes them, so no server-side exchange is needed. Kept as a
// harmless no-op for backward compatibility; safe to delete once no client
// code references it.
// ───────────────────────────────────────────────────────────────────────────

export async function POST() {
  return NextResponse.json({ ok: true, sessionConfigured: true });
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
