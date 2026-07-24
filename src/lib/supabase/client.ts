import { createBrowserClient } from "@supabase/ssr";

// ───────────────────────────────────────────────────────────────────────────
// Browser Supabase client — the client-side singleton (replaces lib/firebase).
//
// Uses the public anon key; the user's auth session is stored in cookies by
// @supabase/ssr so the server can read it. All data access from client code
// (AuthContext, db.ts, audit.ts) goes through this instance and is governed by
// Row-Level Security.
// ───────────────────────────────────────────────────────────────────────────

// Fall back to harmless placeholders when the env is not yet configured, so the
// module can be imported (and public pages can render) before credentials are
// added. Auth/data calls then fail gracefully and are caught by callers, rather
// than throwing at import time and taking down every page.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/** True when real Supabase credentials are configured. */
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createBrowserClient(url, anonKey);

export default supabase;
