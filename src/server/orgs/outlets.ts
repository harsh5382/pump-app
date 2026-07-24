"use server";

import { requireAdmin, isAdminConfigured } from "@/server/supabaseAdmin";
import { requireUser } from "@/server/auth/session";
import { requireCapability } from "@/server/auth/access";
import {
  assertCanAddOutlet,
  EntitlementError,
} from "@/server/billing/entitlements";

export interface OutletSummary {
  id: string;
  code: string;
  name: string;
  omcBrand?: string;
  state?: string;
  timeZone: string;
  status: string;
}

export interface CreateOutletInput {
  organisationId: string;
  name: string;
  code: string;
  omcBrand?: string;
  address?: string;
  state?: string;
  timeZone?: string;
}

export interface CreateOutletResult {
  ok: boolean;
  outletId?: string;
  error?: string;
  needsBackend?: boolean;
  /** Set when the plan's outlet limit blocked this — drives the upgrade CTA. */
  upgradeRequired?: "outlet_limit" | "subscription_inactive";
}

/** Outlets in an organisation the caller belongs to (server-verified). */
export async function listOutlets(
  organisationId: string,
): Promise<OutletSummary[]> {
  if (!isAdminConfigured()) return [];
  try {
    const user = await requireUser();
    await requireCapability({
      uid: user.uid,
      organisationId,
      capability: "org.manage_outlets",
    });
  } catch {
    return [];
  }

  const { data, error } = await requireAdmin()
    .from("outlets")
    .select("id, code, name, omc_brand, state, time_zone, status")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((o) => ({
    id: o.id,
    code: o.code,
    name: o.name,
    omcBrand: o.omc_brand ?? undefined,
    state: o.state ?? undefined,
    timeZone: o.time_zone,
    status: o.status,
  }));
}

// ───────────────────────────────────────────────────────────────────────────
// createOutlet — adding an outlet is a PAID capability (plan.maxOutlets).
// Authorisation (org.manage_outlets) and the entitlement check both run before
// anything is written. The outlet + the creator's outlet_admin membership are
// written together; if the membership write fails the outlet is rolled back so
// we never leave an orphan outlet nobody can access.
// ───────────────────────────────────────────────────────────────────────────
export async function createOutlet(
  input: CreateOutletInput,
): Promise<CreateOutletResult> {
  if (!isAdminConfigured()) {
    return { ok: false, needsBackend: true, error: "Backend not configured." };
  }

  const name = input.name?.trim();
  const code = input.code?.trim();
  if (!name || !code) {
    return { ok: false, error: "Outlet name and code are required." };
  }

  let user;
  try {
    user = await requireUser();
    await requireCapability({
      uid: user.uid,
      organisationId: input.organisationId,
      capability: "org.manage_outlets",
    });
  } catch {
    return { ok: false, error: "Not authorised to add outlets." };
  }

  try {
    await assertCanAddOutlet(input.organisationId);
  } catch (err) {
    if (err instanceof EntitlementError) {
      return {
        ok: false,
        error: err.message,
        upgradeRequired: err.reason as CreateOutletResult["upgradeRequired"],
      };
    }
    return { ok: false, error: "Could not verify your plan limits." };
  }

  const admin = requireAdmin();
  const { data: outlet, error: outletError } = await admin
    .from("outlets")
    .insert({
      organisation_id: input.organisationId,
      code,
      name,
      omc_brand: input.omcBrand ?? "",
      address: input.address ?? "",
      state: input.state ?? "",
      time_zone: input.timeZone || "Asia/Kolkata",
    })
    .select("id")
    .single();

  if (outletError || !outlet) {
    const duplicate = outletError?.message?.includes("duplicate key");
    return {
      ok: false,
      error: duplicate
        ? `An outlet with code "${code}" already exists.`
        : (outletError?.message ?? "Could not create the outlet."),
    };
  }

  const { error: memberError } = await admin.from("outlet_members").insert({
    outlet_id: outlet.id,
    organisation_id: input.organisationId,
    uid: user.uid,
    outlet_role: "outlet_admin",
    status: "active",
  });

  if (memberError) {
    // Compensate: an outlet with no members is unreachable — remove it.
    await admin.from("outlets").delete().eq("id", outlet.id);
    return { ok: false, error: "Could not grant access to the new outlet." };
  }

  return { ok: true, outletId: outlet.id };
}
