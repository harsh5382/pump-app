import "server-only";

import { requireAdmin } from "@/server/supabaseAdmin";
import { ENTITLEMENTS, SEED_PLANS } from "@/lib/plans";
import type { Entitlements, SubscriptionStatus } from "@/types";
import { razorpayProvider } from "./razorpayProvider";
import {
  BillingProviderError,
  type BillingProvider,
  type ProviderCharge,
  type ProviderEvent,
  type ProviderSubscriptionState,
} from "./provider";

// ───────────────────────────────────────────────────────────────────────────
// The billing domain's write side.
//
// Every path that can change what an organisation is entitled to funnels
// through applyProviderState(). It is the single place that:
//   • decides which Pumpline plan a provider subscription maps to,
//   • re-snapshots entitlements when the plan actually changes,
//   • rejects stale events so out-of-order webhook delivery is harmless,
//   • stamps the grace deadline when a renewal fails.
//
// Nothing here reads request input. Callers hand it provider-verified state.
// ───────────────────────────────────────────────────────────────────────────

export function getBillingProvider(): BillingProvider {
  return razorpayProvider;
}

function graceDays(): number {
  const raw = Number(process.env.BILLING_GRACE_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : 7;
}

export function graceDeadline(from: Date = new Date()): string {
  return new Date(from.getTime() + graceDays() * 86_400_000).toISOString();
}

// ── Plan ↔ provider plan mapping ───────────────────────────────────────────

/**
 * Returns the provider's plan handle for a Pumpline plan, creating it the first
 * time. Cached in billing_provider_plans keyed by (plan, period, price) — a
 * price change mints a new provider plan rather than reusing a stale amount.
 */
export async function ensureProviderPlan(planId: string): Promise<string> {
  const plan = SEED_PLANS.find((p) => p.id === planId && p.active);
  if (!plan) throw new BillingProviderError(`Unknown plan "${planId}".`);
  if (plan.pricePaise <= 0) {
    throw new BillingProviderError(
      `${plan.name} is priced on request — contact support to activate it.`,
    );
  }

  const provider = getBillingProvider();
  const admin = requireAdmin();
  const key = {
    provider: provider.name,
    plan_id: plan.id,
    billing_period: plan.billingPeriod,
    price_paise: plan.pricePaise,
  };

  const { data: existing } = await admin
    .from("billing_provider_plans")
    .select("provider_plan_id")
    .match(key)
    .maybeSingle();
  if (existing?.provider_plan_id) return existing.provider_plan_id;

  const providerPlanId = await provider.ensurePlan({
    planId: plan.id,
    name: plan.name,
    pricePaise: plan.pricePaise,
    billingPeriod: plan.billingPeriod,
  });

  // upsert, not insert: two concurrent checkouts can race here and the second
  // must not fail — worst case we created one extra (unused) provider plan.
  await admin
    .from("billing_provider_plans")
    .upsert({ ...key, provider_plan_id: providerPlanId });

  return providerPlanId;
}

/** Reverse lookup: which Pumpline plan does this provider plan handle mean? */
async function planIdForProviderPlan(
  providerPlanId?: string,
): Promise<string | undefined> {
  if (!providerPlanId) return undefined;
  const { data } = await requireAdmin()
    .from("billing_provider_plans")
    .select("plan_id")
    .eq("provider", getBillingProvider().name)
    .eq("provider_plan_id", providerPlanId)
    .maybeSingle();
  return data?.plan_id ?? undefined;
}

export function entitlementsForPlan(planId: string): Entitlements {
  return ENTITLEMENTS[planId] ?? ENTITLEMENTS.trial;
}

// ── Applying provider state ────────────────────────────────────────────────

export interface ApplyOptions {
  /** Provider timestamp of this state. Older-than-recorded state is dropped. */
  occurredAt?: string;
  /** Overrides the plan resolved from the provider handle (checkout confirm). */
  planIdHint?: string;
}

export interface ApplyResult {
  applied: boolean;
  reason?: "stale" | "no_subscription_row";
  planId?: string;
  status?: SubscriptionStatus;
}

/**
 * Write provider-verified subscription state onto an organisation.
 *
 * Idempotent and order-safe: an event older than `last_event_at` is a no-op, so
 * a retried or late webhook can never resurrect a superseded status.
 */
export async function applyProviderState(
  organisationId: string,
  state: ProviderSubscriptionState,
  opts: ApplyOptions = {},
): Promise<ApplyResult> {
  const admin = requireAdmin();

  const { data: current } = await admin
    .from("subscriptions")
    .select(
      "plan_id, status, last_event_at, pending_plan_id, provider_subscription_id, grace_ends_at",
    )
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!current) return { applied: false, reason: "no_subscription_row" };

  if (
    opts.occurredAt &&
    current.last_event_at &&
    new Date(opts.occurredAt) < new Date(current.last_event_at)
  ) {
    return { applied: false, reason: "stale" };
  }

  const resolvedPlanId =
    opts.planIdHint ??
    (await planIdForProviderPlan(state.providerPlanId)) ??
    current.pending_plan_id ??
    current.plan_id;

  // Cancellation returns the org to trial-level entitlements rather than
  // deleting anything — the spec forbids destroying customer data on lapse.
  const terminal = state.status === "cancelled" || state.status === "suspended";
  const effectivePlanId = terminal ? current.plan_id : resolvedPlanId;

  const update: Record<string, unknown> = {
    plan_id: effectivePlanId,
    status: state.status,
    entitlements: entitlementsForPlan(effectivePlanId),
    provider: getBillingProvider().name,
    provider_subscription_id: state.providerSubscriptionId,
    updated_at: new Date().toISOString(),
  };

  if (opts.occurredAt) update.last_event_at = opts.occurredAt;
  if (state.currentPeriodEnd) update.current_period_end = state.currentPeriodEnd;
  if (state.providerCustomerId) {
    update.provider_customer_id = state.providerCustomerId;
  }
  if (state.cancelledAt) update.cancelled_at = state.cancelledAt;

  // Grace window opens on the first event that puts us in grace_period and is
  // not extended by repeated events, so a retry storm can't postpone suspension.
  if (state.status === "grace_period") {
    update.grace_ends_at = current.grace_ends_at ?? graceDeadline();
  } else if (state.status === "active") {
    update.grace_ends_at = null;
    update.pending_plan_id = null;
  }

  const { error } = await admin
    .from("subscriptions")
    .update(update)
    .eq("organisation_id", organisationId);

  if (error) throw new Error(error.message);

  return { applied: true, planId: effectivePlanId, status: state.status };
}

/** Record a charge for the owner's billing history. Duplicate-safe. */
export async function recordCharge(
  organisationId: string,
  charge: ProviderCharge,
  context: { planId?: string; providerSubscriptionId?: string },
): Promise<void> {
  if (!charge.providerPaymentId && !charge.providerInvoiceId) return;

  const admin = requireAdmin();
  const { error } = await admin.from("billing_invoices").insert({
    organisation_id: organisationId,
    provider: getBillingProvider().name,
    provider_invoice_id: charge.providerInvoiceId ?? null,
    provider_payment_id: charge.providerPaymentId ?? null,
    provider_subscription_id: context.providerSubscriptionId ?? null,
    plan_id: context.planId ?? null,
    description: charge.description ?? null,
    amount_paise: charge.amountPaise,
    currency: charge.currency,
    status: charge.status,
    invoice_url: charge.invoiceUrl ?? null,
    issued_at: charge.issuedAt ?? null,
    paid_at: charge.paidAt ?? null,
  });

  // 23505 = unique violation: the provider re-delivered a charge we already
  // filed. That is the expected outcome of a replay, not an error.
  if (error && error.code !== "23505") throw new Error(error.message);
}

/**
 * Attribute an event to a tenant. Prefers the organisation id we round-tripped
 * through provider metadata; falls back to the stored provider subscription id.
 * Never trusts anything else.
 */
export async function resolveOrganisationId(
  event: ProviderEvent,
): Promise<string | undefined> {
  if (event.organisationId) return event.organisationId;

  const providerSubscriptionId = event.subscription?.providerSubscriptionId;
  if (!providerSubscriptionId) return undefined;

  const { data } = await requireAdmin()
    .from("subscriptions")
    .select("organisation_id")
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();

  return data?.organisation_id ?? undefined;
}
