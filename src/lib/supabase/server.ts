import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

// ───────────────────────────────────────────────────────────────────────────
// Cookie-bound server Supabase client — carries the CURRENT USER's session.
//
// Use this in server actions / route handlers to identify who is calling
// (supabase.auth.getUser()). It uses the anon key and the request cookies, so
// it is subject to RLS. Privileged writes use the service-role client instead
// (see src/server/supabaseAdmin.ts).
// ───────────────────────────────────────────────────────────────────────────

export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; the middleware
            // refreshes the session cookie on the response instead.
          }
        },
      },
    },
  );
}
