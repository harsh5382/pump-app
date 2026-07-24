"use server";

import { isAdminConfigured } from "@/server/supabaseAdmin";
import { requireUser } from "@/server/auth/session";
import { requireCapability } from "@/server/auth/access";
import { getEntitlementSnapshot } from "@/server/billing/entitlements";
import { SEED_PLANS } from "@/lib/plans";
import type { Entitlements, SubscriptionStatus } from "@/types";

export interface BillingOverview {
  ok: boolean;
  error?: string;
  planId?: string;
  planName?: string;
  status?: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  entitlements?: Entitlements;
  usage?: { members: number; managers: number; outlets: number };
  /** Plans the org could move up to, for the upgrade CTA. */
  upgradeOptions?: {
    id: string;
    name: string;
    pricePaise: number;
    maxOutlets: number;
    maxMembers: number;
  }[];
}

// Server-verified billing snapshot for the current organisation. Requires the
// org.manage_billing capability (owner only, per the capability matrix).
export async function getBillingOverview(
  organisationId: string,
): Promise<BillingOverview> {
  if (!isAdminConfigured()) {
    return { ok: false, error: "Backend not configured." };
  }

  try {
    const user = await requireUser();
    await requireCapability({
      uid: user.uid,
      organisationId,
      capability: "org.manage_billing",
    });
  } catch {
    return { ok: false, error: "Only the organisation owner can view billing." };
  }

  const { subscription, usage } = await getEntitlementSnapshot(organisationId);

  const currentIndex = SEED_PLANS.findIndex((p) => p.id === subscription.planId);
  const upgradeOptions = SEED_PLANS.filter(
    (p, i) => p.active && i > currentIndex,
  ).map((p) => ({
    id: p.id,
    name: p.name,
    pricePaise: p.pricePaise,
    maxOutlets: p.entitlements.maxOutlets,
    maxMembers: p.entitlements.maxMembers,
  }));

  return {
    ok: true,
    planId: subscription.planId,
    planName:
      SEED_PLANS.find((p) => p.id === subscription.planId)?.name ??
      subscription.planId,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    entitlements: subscription.entitlements,
    usage,
    upgradeOptions,
  };
}
