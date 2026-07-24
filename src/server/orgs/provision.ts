"use server";

import { requireAdmin, isAdminConfigured } from "@/server/supabaseAdmin";
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
// registered user into an organisation owner. Delegates to the atomic
// provision_organisation() SQL function (org + owner membership + outlet +
// outlet membership + trial subscription, all in one transaction).
// Idempotent: if the user already belongs to an org, returns it instead.
// ───────────────────────────────────────────────────────────────────────────
export async function provisionOrganisation(
  input: ProvisionInput,
): Promise<ProvisionResult> {
  if (!isAdminConfigured()) {
    return {
      ok: false,
      needsBackend: true,
      error:
        "Server backend not configured. Set SUPABASE_SERVICE_ROLE_KEY to enable onboarding.",
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

  const trialEndsAt = new Date(
    Date.now() + 14 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await requireAdmin().rpc("provision_organisation", {
    p_user_id: user.uid,
    p_email: user.email ?? "",
    p_display_name: user.name ?? user.email ?? "Owner",
    p_org_name: orgName,
    p_outlet_name: outletName,
    p_outlet_code: outletCode,
    p_omc_brand: input.outlet.omcBrand ?? "",
    p_address: input.outlet.address ?? "",
    p_state: input.outlet.state ?? "",
    p_time_zone: input.outlet.timeZone ?? "Asia/Kolkata",
    p_terms_version: input.acceptedTermsVersion,
    p_privacy_version: input.acceptedPrivacyVersion,
    p_plan_id: TRIAL_PLAN_ID,
    p_entitlements: ENTITLEMENTS.trial,
    p_trial_ends_at: trialEndsAt,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  // The function returns a single row { organisation_id, outlet_id }.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: true,
    organisationId: row?.organisation_id,
    outletId: row?.outlet_id,
  };
}
