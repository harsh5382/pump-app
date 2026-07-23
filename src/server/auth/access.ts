import "server-only";

import { adminDb } from "@/server/firebaseAdmin";
import {
  resolveCapabilities,
  type Capability,
  type EffectiveAccess,
} from "@/lib/capabilities";
import type {
  OrganisationMembership,
  OutletMembership,
} from "@/types";

// ───────────────────────────────────────────────────────────────────────────
// Tenancy authorization — resolves a user's effective access for an
// organisation/outlet and enforces named capabilities. SERVER ONLY.
//
// This is the authoritative check. Firestore rules provide defence-in-depth,
// but every privileged server operation must also pass requireCapability().
// ───────────────────────────────────────────────────────────────────────────

export async function getOrganisationMembership(
  organisationId: string,
  uid: string,
): Promise<OrganisationMembership | null> {
  const snap = await adminDb()
    .doc(`organisations/${organisationId}/members/${uid}`)
    .get();
  const data = snap.data() as OrganisationMembership | undefined;
  if (!data || data.status !== "active") return null;
  return data;
}

export async function getOutletMembership(
  organisationId: string,
  outletId: string,
  uid: string,
): Promise<OutletMembership | null> {
  const snap = await adminDb()
    .doc(`organisations/${organisationId}/outlets/${outletId}/members/${uid}`)
    .get();
  const data = snap.data() as OutletMembership | undefined;
  if (!data || data.status !== "active") return null;
  return data;
}

export async function getEffectiveAccess(args: {
  uid: string;
  organisationId: string;
  outletId?: string;
}): Promise<EffectiveAccess> {
  const orgMembership = await getOrganisationMembership(
    args.organisationId,
    args.uid,
  );
  const outletMembership = args.outletId
    ? await getOutletMembership(args.organisationId, args.outletId, args.uid)
    : null;
  return {
    organisationRole: orgMembership?.organisationRole,
    outletRole: outletMembership?.outletRole,
  };
}

export class ForbiddenError extends Error {
  constructor(capability: Capability) {
    super(`Missing capability: ${capability}`);
    this.name = "ForbiddenError";
  }
}

/**
 * Throws ForbiddenError unless the user holds `capability` in the given
 * org/outlet context. Returns the resolved access on success.
 */
export async function requireCapability(args: {
  uid: string;
  organisationId: string;
  outletId?: string;
  capability: Capability;
}): Promise<EffectiveAccess> {
  const access = await getEffectiveAccess(args);
  if (!resolveCapabilities(access).has(args.capability)) {
    throw new ForbiddenError(args.capability);
  }
  return access;
}
