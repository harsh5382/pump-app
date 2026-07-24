import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";

// ───────────────────────────────────────────────────────────────────────────
// Server-side session handling (Supabase).
//
// @supabase/ssr stores the auth session in httpOnly cookies. The middleware
// keeps the token fresh; here we read the verified user for privileged server
// operations. We never trust client-supplied claims — getUser() validates the
// token against Supabase Auth.
// ───────────────────────────────────────────────────────────────────────────

/** Normalized session identity used across the server (replaces DecodedIdToken). */
export interface SessionUser {
  uid: string;
  email?: string;
  name?: string;
  platformSuperAdmin: boolean;
}

/** Verify the session. Returns the user or null (fail closed). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;

  const meta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const userMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    uid: user.id,
    email: user.email ?? undefined,
    name:
      (userMeta.display_name as string) ??
      (userMeta.full_name as string) ??
      user.email ??
      undefined,
    platformSuperAdmin: meta.platform_super_admin === true,
  };
}

/** Like getCurrentUser but throws when unauthenticated. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthenticatedError();
  return user;
}

export function isPlatformSuperAdmin(user: SessionUser): boolean {
  return user.platformSuperAdmin === true;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "UnauthenticatedError";
  }
}
