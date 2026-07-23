"use server";

import { adminDb, isAdminConfigured } from "@/server/firebaseAdmin";
import { requireUser } from "@/server/auth/session";
import { ENTITLEMENTS, TRIAL_PLAN_ID } from "@/lib/plans";

export interface ProvisionInput {
  organisationName: string;
  outlet: {
    name: string;
    code: string;
    omcBrand?: string;
    address?: string;
    state?: string;
    timeZone?: string;
  };
  acceptedTermsVersion: string;
  acceptedPrivacyVersion: string;
}

export interface ProvisionResult {
  ok: boolean;
  organisationId?: string;
  outletId?: string;
  error?: string;
  needsBackend?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// provisionOrganisation — the ONE trusted transaction that turns a freshly
// registered user into an organisation owner. Creates, atomically:
//   organisations/{org}, members/{uid}=owner, outlets/{outlet},
//   outlets/{outlet}/members/{uid}=outlet_admin, subscriptions/{org}=trialing,
//   users/{uid}/accessIndex/{org}, and stamps the user's accepted-terms.
// Idempotent: if the user already owns an org, returns it instead of duplicating.
// ───────────────────────────────────────────────────────────────────────────
export async function provisionOrganisation(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  if (!isAdminConfigured()) {
    return {
      ok: false,
      needsBackend: true,
      error:
        "Server backend not configured. Add FIREBASE_SERVICE_ACCOUNT to enable onboarding.",
    };
  }

  const orgName = input.organisationName?.trim();
  const outletName = input.outlet?.name?.trim();
  const outletCode = input.outlet?.code?.trim();
  if (!orgName || !outletName || !outletCode) {
    return { ok: false, error: "Organisation and outlet details are required." };
  }

  let user;
  try {
    user = await requireUser();
  } catch {
    return { ok: false, error: "You must be signed in." };
  }

  const db = adminDb();
  const now = new Date().toISOString();

  // Idempotency: already onboarded?
  const existing = await db
    .collection(`users/${user.uid}/accessIndex`)
    .limit(1)
    .get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    const data = doc.data();
    const outletId = Object.keys(data.outletRoles ?? {})[0];
    return { ok: true, organisationId: doc.id, outletId };
  }

  const orgRef = db.collection("organisations").doc();
  const outletRef = orgRef.collection("outlets").doc();
  const timeZone = input.outlet.timeZone || "Asia/Kolkata";

  await db.runTransaction(async (tx) => {
    tx.set(orgRef, {
      id: orgRef.id,
      name: orgName,
      ownerUid: user.uid,
      status: "active",
      locale: "en-IN",
      createdAt: now,
      updatedAt: now,
    });

    tx.set(orgRef.collection("members").doc(user.uid), {
      uid: user.uid,
      email: user.email ?? "",
      displayName: (user.name as string) ?? user.email ?? "Owner",
      organisationRole: "organisation_owner",
      status: "active",
      acceptedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    tx.set(outletRef, {
      id: outletRef.id,
      code: outletCode,
      name: outletName,
      omcBrand: input.outlet.omcBrand ?? "",
      address: input.outlet.address ?? "",
      state: input.outlet.state ?? "",
      timeZone,
      businessDayCutoverHour: 0,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    tx.set(outletRef.collection("members").doc(user.uid), {
      uid: user.uid,
      outletRole: "outlet_admin",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    tx.set(db.collection("subscriptions").doc(orgRef.id), {
      organisationId: orgRef.id,
      planId: TRIAL_PLAN_ID,
      status: "trialing",
      entitlements: ENTITLEMENTS.trial,
      trialEndsAt: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      createdAt: now,
      updatedAt: now,
    });

    tx.set(db.doc(`users/${user.uid}/accessIndex/${orgRef.id}`), {
      organisationId: orgRef.id,
      organisationName: orgName,
      organisationRole: "organisation_owner",
      outletRoles: { [outletRef.id]: "outlet_admin" },
      updatedAt: now,
    });

    tx.set(
      db.doc(`users/${user.uid}`),
      {
        acceptedTermsVersion: input.acceptedTermsVersion,
        acceptedPrivacyVersion: input.acceptedPrivacyVersion,
        updatedAt: now,
      },
      { merge: true },
    );
  });

  return { ok: true, organisationId: orgRef.id, outletId: outletRef.id };
}
