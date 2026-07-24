import { supabase } from "@/lib/supabase/client";

// ───────────────────────────────────────────────────────────────────────────
// Session bridge (Supabase).
//
// With @supabase/ssr the browser client writes the auth session to cookies
// automatically on sign-in, and the middleware keeps it fresh — so there is no
// ID-token → session-cookie exchange step anymore. These functions are kept for
// API compatibility with existing callers (OrgContext, signup):
//   • establishServerSession — ensures the session token is materialised into
//     cookies (a no-op refresh; safe to call repeatedly).
//   • clearServerSession — clears the auth cookies on sign-out.
// ───────────────────────────────────────────────────────────────────────────

export async function establishServerSession(): Promise<void> {
  try {
    // Touch the session so the auth cookies are present before the server
    // action that reads them runs. No token exchange required.
    await supabase.auth.getSession();
  } catch {
    // ignore — the app still functions; server calls will fail closed.
  }
}

export async function clearServerSession(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}
