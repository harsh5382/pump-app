"use server";

import { requireAdmin, isAdminConfigured } from "@/server/supabaseAdmin";
import { getCurrentUser } from "@/server/auth/session";
import type { AccessIndexEntry } from "@/types";

export interface MyAccess {
  signedIn: boolean;
  backendConfigured: boolean;
  uid?: string;
  email?: string;
  isPlatformSuperAdmin?: boolean;
  organisations: AccessIndexEntry[];
}

// loadMyAccess — server-verified summary of the organisations/outlets the
// current user can access, used to populate the client OrgContext + switcher.
// Computed live from memberships via the get_my_access() SQL function; never
// trusts the client.
export async function loadMyAccess(): Promise<MyAccess> {
  if (!isAdminConfigured()) {
    return { signedIn: false, backendConfigured: false, organisations: [] };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { signedIn: false, backendConfigured: true, organisations: [] };
  }

  const { data, error } = await requireAdmin().rpc("get_my_access", {
    p_user_id: user.uid,
  });

  const organisations = (error ? [] : (data as AccessIndexEntry[])) ?? [];
  return {
    signedIn: true,
    backendConfigured: true,
    uid: user.uid,
    email: user.email ?? undefined,
    isPlatformSuperAdmin: user.platformSuperAdmin === true,
    organisations,
  };
}
