import "server-only";

import { requireAdmin } from "@/server/supabaseAdmin";
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
// This is the authoritative check. RLS provides defence-in-depth, but every
// privileged server operation must also pass requireCapability(). Membership
// rows are read with the service-role client (bypasses RLS by design).
// ───────────────────────────────────────────────────────────────────────────

export async function getOrganisationMembership(
  organisationId: string,
  uid: string,
): Promise<OrganisationMembership | null> {
  const { data, error } = await requireAdmin()
    .from("organisation_members")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("uid", uid)
    .maybeSingle();
  if (error || !data || data.status !== "active") return null;
  return {
    uid: data.uid,
    email: data.email,
    displayName: data.display_name,
    organisationRole: data.organisation_role,
    status: data.status,
    invitedBy: data.invited_by ?? undefined,
    acceptedAt: data.accepted_at ?? undefined,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getOutletMembership(
  organisationId: string,
  outletId: string,
  uid: string,
): Promise<OutletMembership | null> {
  const { data, error } = await requireAdmin()
    .from("outlet_members")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("outlet_id", outletId)
    .eq("uid", uid)
    .maybeSingle();
  if (error || !data || data.status !== "active") return null;
  return {
    uid: data.uid,
    outletRole: data.outlet_role,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
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
