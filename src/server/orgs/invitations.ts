"use server";

import { randomBytes, createHash } from "crypto";
import { requireAdmin, isAdminConfigured } from "@/server/supabaseAdmin";
import { requireUser } from "@/server/auth/session";
import { requireCapability } from "@/server/auth/access";
import type { OrganisationRole, OutletRole } from "@/types";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface CreateInvitationInput {
  organisationId: string;
  email: string;
  organisationRole: OrganisationRole;
  outletRoles: Record<string, OutletRole>;
}

export interface CreateInvitationResult {
  ok: boolean;
  invitationId?: string;
  /** Plain single-use token — only returned ONCE, never stored in plaintext. */
  token?: string;
  error?: string;
  needsBackend?: boolean;
}

// createInvitation — an authorised org admin/owner invites a teammate. We store
// only the SHA-256 hash of a single-use token; the plain token is returned once
// so the caller can build the invite link (emailed in a later phase).
export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  if (!isAdminConfigured()) {
    return { ok: false, needsBackend: true, error: "Backend not configured." };
  }
  const email = input.email?.trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };

  let user;
  try {
    user = await requireUser();
    await requireCapability({
      uid: user.uid,
      organisationId: input.organisationId,
      capability: "org.manage_members",
    });
  } catch {
    return { ok: false, error: "Not authorised to invite members." };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await requireAdmin()
    .from("invitations")
    .insert({
      organisation_id: input.organisationId,
      token_hash: hashToken(token),
      email,
      organisation_role: input.organisationRole,
      outlet_roles: input.outletRoles ?? {},
      status: "pending",
      invited_by: user.uid,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, invitationId: data.id, token };
}

export interface AcceptInvitationInput {
  organisationId: string;
  token: string;
}

export interface AcceptInvitationResult {
  ok: boolean;
  organisationId?: string;
  error?: string;
  needsBackend?: boolean;
}

// acceptInvitation — the invited user (now signed in) redeems the token.
// Atomic and idempotent via the accept_invitation() SQL function: it rejects
// expired/used/revoked/mismatched invitations and grants org + outlet
// memberships in one transaction.
export async function acceptInvitation(
  input: AcceptInvitationInput,
): Promise<AcceptInvitationResult> {
  if (!isAdminConfigured()) {
    return { ok: false, needsBackend: true, error: "Backend not configured." };
  }
  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "You must be signed in to accept an invite." };
  }

  const { data, error } = await requireAdmin().rpc("accept_invitation", {
    p_user_id: user.uid,
    p_email: user.email ?? "",
    p_display_name: user.name ?? user.email ?? "Member",
    p_org_id: input.organisationId,
    p_token_hash: hashToken(input.token ?? ""),
  });

  if (error) return { ok: false, error: error.message };

  const result = data as { ok: boolean; error?: string; organisationId?: string };
  if (!result?.ok) {
    return { ok: false, error: result?.error ?? "Could not accept invitation." };
  }
  return { ok: true, organisationId: result.organisationId ?? input.organisationId };
}
