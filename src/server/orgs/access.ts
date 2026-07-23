"use server";

import { adminDb, isAdminConfigured } from "@/server/firebaseAdmin";
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
// Reads the server-maintained users/{uid}/accessIndex; never trusts the client.
export async function loadMyAccess(): Promise<MyAccess> {
  if (!isAdminConfigured()) {
    return { signedIn: false, backendConfigured: false, organisations: [] };
  }
  const user = await getCurrentUser();
  if (!user) {
    return { signedIn: false, backendConfigured: true, organisations: [] };
  }
  const snap = await adminDb()
    .collection(`users/${user.uid}/accessIndex`)
    .get();
  const organisations = snap.docs.map((d) => d.data() as AccessIndexEntry);
  return {
    signedIn: true,
    backendConfigured: true,
    uid: user.uid,
    email: user.email ?? undefined,
    isPlatformSuperAdmin: user.platformSuperAdmin === true,
    organisations,
  };
}
