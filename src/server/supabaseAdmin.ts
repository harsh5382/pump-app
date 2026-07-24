import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ───────────────────────────────────────────────────────────────────────────
// Service-role Supabase client — SERVER ONLY (replaces firebaseAdmin).
//
// Uses the SERVICE_ROLE key, which BYPASSES Row-Level Security. This is the
// trusted backend: authorization is enforced in TypeScript (capabilities.ts /
// requireCapability) before any privileged write, exactly as the Firebase
// Admin SDK worked previously.
//
// Init is lazy and never throws at import time, so public pages build/run
// without the key. Trusted operations call requireAdmin() and fail closed.
// ───────────────────────────────────────────────────────────────────────────

let cached: SupabaseClient | null = null;

function createAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Returns the service-role client, or null when the key is not configured. */
export function getAdmin(): SupabaseClient | null {
  if (cached) return cached;
  cached = createAdmin();
  return cached;
}

/** Returns the service-role client or throws — for trusted operations. */
export function requireAdmin(): SupabaseClient {
  const client = getAdmin();
  if (!client) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY " +
        "(and NEXT_PUBLIC_SUPABASE_URL) in the server environment.",
    );
  }
  return client;
}

/** True when the service-role key is present (use to gate trusted features). */
export function isAdminConfigured(): boolean {
  return getAdmin() !== null;
}
