import "server-only";

import { cookies } from "next/headers";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/server/firebaseAdmin";

// ───────────────────────────────────────────────────────────────────────────
// Server-side session handling.
//
// Flow: client signs in with Firebase Auth → posts its ID token to
// /api/auth/session → we mint an httpOnly Firebase SESSION COOKIE. Every
// privileged server request verifies that cookie. We never trust client claims.
//
// "__session" is the only cookie name forwarded by Firebase Hosting/App Hosting
// CDN, so we use it for portability.
// ───────────────────────────────────────────────────────────────────────────

export const SESSION_COOKIE = "__session";
const DEFAULT_EXPIRES_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

/** Exchange a freshly-minted Firebase ID token for a durable session cookie. */
export async function createSessionCookie(
  idToken: string,
  expiresInMs: number = DEFAULT_EXPIRES_MS,
): Promise<{ value: string; maxAgeSeconds: number }> {
  // Reject tokens older than 5 minutes — forces a recent sign-in.
  const decoded = await adminAuth().verifyIdToken(idToken, true);
  if (Date.now() / 1000 - decoded.auth_time > 5 * 60) {
    throw new Error("Recent sign-in required.");
  }
  const value = await adminAuth().createSessionCookie(idToken, {
    expiresIn: expiresInMs,
  });
  return { value, maxAgeSeconds: Math.floor(expiresInMs / 1000) };
}

/** Verify the session cookie. Returns the decoded token or null (fail closed). */
export async function getCurrentUser(): Promise<DecodedIdToken | null> {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  try {
    // checkRevoked: true so removed/disabled users lose access promptly.
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}

/** Like getCurrentUser but throws when unauthenticated. */
export async function requireUser(): Promise<DecodedIdToken> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export function isPlatformSuperAdmin(user: DecodedIdToken): boolean {
  return user.platformSuperAdmin === true;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "UnauthenticatedError";
  }
}
