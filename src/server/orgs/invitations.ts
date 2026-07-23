"use server";

import { randomBytes, createHash } from "crypto";
import { adminDb, isAdminConfigured } from "@/server/firebaseAdmin";
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
  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const ref = adminDb()
    .collection(`organisations/${input.organisationId}/invitations`)
    .doc();
  await ref.set({
    id: ref.id,
    organisationId: input.organisationId,
    tokenHash: hashToken(token),
    email,
    organisationRole: input.organisationRole,
    outletRoles: input.outletRoles ?? {},
    status: "pending",
    invitedBy: user.uid,
    expiresAt,
    createdAt: now,
  });

  return { ok: true, invitationId: ref.id, token };
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

// acceptInvitation — the invited user (now signed in) redeems the token. Atomic
// and idempotent: rejects expired/used/revoked/mismatched invitations and grants
// org + outlet memberships plus the accessIndex entry in one transaction.
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

  const db = adminDb();
  const tokenHash = hashToken(input.token ?? "");
  const matches = await db
    .collection(`organisations/${input.organisationId}/invitations`)
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get();

  if (matches.empty) {
    return { ok: false, error: "Invitation not found." };
  }
  const invRef = matches.docs[0].ref;
  const inv = matches.docs[0].data();

  if (inv.status !== "pending") {
    return { ok: false, error: "This invitation has already been used or revoked." };
  }
  if (new Date(inv.expiresAt).getTime() < Date.now()) {
    return { ok: false, error: "This invitation has expired." };
  }
  if (inv.email && user.email && inv.email !== user.email.toLowerCase()) {
    return { ok: false, error: "This invitation was issued to a different email." };
  }

  const now = new Date().toISOString();
  const orgRef = db.doc(`organisations/${input.organisationId}`);
  const orgSnap = await orgRef.get();
  const orgName = (orgSnap.data()?.name as string) ?? "Organisation";

  await db.runTransaction(async (tx) => {
    tx.set(orgRef.collection("members").doc(user.uid), {
      uid: user.uid,
      email: user.email ?? "",
      displayName: (user.name as string) ?? user.email ?? "Member",
      organisationRole: inv.organisationRole,
      status: "active",
      invitedBy: inv.invitedBy,
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    const outletRoles: Record<string, OutletRole> = inv.outletRoles ?? {};
    for (const [outletId, outletRole] of Object.entries(outletRoles)) {
      tx.set(
        orgRef.collection("outlets").doc(outletId).collection("members").doc(user.uid),
        {
          uid: user.uid,
          outletRole,
          status: "active",
          createdAt: now,
          updatedAt: now,
        },
      );
    }

    tx.set(db.doc(`users/${user.uid}/accessIndex/${input.organisationId}`), {
      organisationId: input.organisationId,
      organisationName: orgName,
      organisationRole: inv.organisationRole,
      outletRoles,
      updatedAt: now,
    });

    tx.update(invRef, {
      status: "accepted",
      acceptedByUid: user.uid,
      acceptedAt: now,
    });
  });

  return { ok: true, organisationId: input.organisationId };
}
