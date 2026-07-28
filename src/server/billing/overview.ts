"use server";

import { isAdminConfigured, requireAdmin } from "@/server/supabaseAdmin";
import { requireUser } from "@/server/auth/session";
import { requireCapability } from "@/server/auth/access";
import { getEntitlementSnapshot } from "@/server/billing/entitlements";
import { getBillingProvider } from "@/server/billing/subscriptionState";
import { SEED_PLANS } from "@/lib/plans";
import type { Entitlements, SubscriptionStatus } from "@/types";

export interface BillingInvoiceRow {
  id: string;
  description: string;
  amountPaise: number;
  currency: string;
  status: string;
  invoiceUrl?: string;
  at?: string;
}

export interface BillingOverview {
  ok: boolean;
  error?: string;
  planId?: string;
  planName?: string;
  status?: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  graceEndsAt?: string;
  entitlements?: Entitlements;
  usage?: { members: number; managers: number; outlets: number };
  /** Plans the org could move up to, for the upgrade CTA. */
  upgradeOptions?: {
    id: string;
    name: string;
    pricePaise: number;
    maxOutlets: number;
    maxMembers: number;
    /** False for "contact us" tiers — the button becomes a support link. */
    purchasable: boolean;
  }[];
  /** True when the payment provider is wired up; false hides the pay buttons. */
  paymentsEnabled?: boolean;
  /** True when there is a live provider subscription that can be cancelled. */
  canCancel?: boolean;
  invoices?: BillingInvoiceRow[];
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
    purchasable: p.pricePaise > 0,
  }));

  const { data: invoiceRows } = await requireAdmin()
    .from("billing_invoices")
    .select(
      "id, description, amount_paise, currency, status, invoice_url, paid_at, issued_at, created_at, plan_id",
    )
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: false })
    .limit(24);

  const invoices: BillingInvoiceRow[] = (invoiceRows ?? []).map((row) => ({
    id: row.id,
    description:
      row.description ??
      (row.plan_id
        ? `${SEED_PLANS.find((p) => p.id === row.plan_id)?.name ?? row.plan_id} subscription`
        : "Subscription charge"),
    amountPaise: Number(row.amount_paise ?? 0),
    currency: row.currency ?? "INR",
    status: row.status,
    invoiceUrl: row.invoice_url ?? undefined,
    at: row.paid_at ?? row.issued_at ?? row.created_at ?? undefined,
  }));

  const cancellable: SubscriptionStatus[] = [
    "active",
    "past_due",
    "grace_period",
  ];

  return {
    ok: true,
    planId: subscription.planId,
    planName:
      SEED_PLANS.find((p) => p.id === subscription.planId)?.name ??
      subscription.planId,
    status: subscription.status,
    trialEndsAt: subscription.trialEndsAt,
    currentPeriodEnd: subscription.currentPeriodEnd,
    graceEndsAt: subscription.graceEndsAt,
    entitlements: subscription.entitlements,
    usage,
    upgradeOptions,
    paymentsEnabled: getBillingProvider().isConfigured(),
    canCancel:
      Boolean(subscription.providerSubscriptionId) &&
      cancellable.includes(subscription.status),
    invoices,
  };
}
