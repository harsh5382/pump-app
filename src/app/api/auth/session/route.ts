import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  createSessionCookie,
  SESSION_COOKIE,
} from "@/server/auth/session";
import { isAdminConfigured } from "@/server/firebaseAdmin";

// POST /api/auth/session  { idToken } → set an httpOnly Firebase session cookie.
// DELETE /api/auth/session → clear it (sign out server-side).
//
// When the Admin SDK isn't configured yet, this no-ops gracefully so the legacy
// client auth flow keeps working until the service-account key is added.

export async function POST(req: Request) {
  if (!isAdminConfigured()) {
    return NextResponse.json({ ok: true, sessionConfigured: false });
  }
  let idToken: string | undefined;
  try {
    ({ idToken } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }
  try {
    const { value, maxAgeSeconds } = await createSessionCookie(idToken);
    cookies().set(SESSION_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });
    return NextResponse.json({ ok: true, sessionConfigured: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Session error";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}

export async function DELETE() {
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
