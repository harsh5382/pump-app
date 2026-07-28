"use server";

import { isAdminConfigured, requireAdmin } from "@/server/supabaseAdmin";
import { requireUser } from "@/server/auth/session";
import { requireCapability } from "@/server/auth/access";
import { SEED_PLANS } from "@/lib/plans";
import { loadSubscription } from "./entitlements";
import { BillingProviderError } from "./provider";
import {
  applyProviderState,
  ensureProviderPlan,
  getBillingProvider,
} from "./subscriptionState";

// ───────────────────────────────────────────────────────────────────────────
// Checkout — the only browser-reachable path that touches billing.
//
// The browser sends a plan ID and nothing else. Price, entitlements and the
// resulting status are all resolved server-side from plans.ts and the provider;
// a tampered request can at most ask to buy a different published plan.
//
// The success callback is treated as a HINT, not as truth: its signature is
// verified, and the subscription is then re-read from the provider before any
// entitlement changes. The webhook remains the authoritative channel.
// ───────────────────────────────────────────────────────────────────────────

export interface CheckoutSession {
  ok: boolean;
  error?: string;
  /** Provider subscription to open the payment sheet against. */
  providerSubscriptionId?: string;
  /** Publishable key — safe for the browser. */
  publishableKey?: string;
  planId?: string;
  planName?: string;
  amountPaise?: number;
  /** Hosted payment page, if the sheet cannot be opened. */
  shortUrl?: string;
  prefill?: { name?: string; email?: string };
  organisationName?: string;
}

async function authoriseBilling(organisationId: string) {
  const user = await requireUser();
  await requireCapability({
    uid: user.uid,
    organisationId,
    capability: "org.manage_billing",
  });
  return user;
}

/** True when Razorpay credentials are present — drives the UI's CTA state. */
export async function isBillingConfigured(): Promise<boolean> {
  return isAdminConfigured() && getBillingProvider().isConfigured();
}

/**
 * Create a provider subscription for `planId` and hand the browser everything
 * it needs to open the payment sheet. No entitlement is granted here — the org
 * stays on its current plan until a verified payment says otherwise.
 */
export async function startPlanCheckout(
  organisationId: string,
  planId: string,
): Promise<CheckoutSession> {
  if (!isAdminConfigured()) {
    return { ok: false, error: "Backend not configured." };
  }

  const provider = getBillingProvider();
  if (!provider.isConfigured()) {
    return {
      ok: false,
      error: "Online payments are not configured yet. Contact support.",
    };
  }

  let user;
  try {
    user = await authoriseBilling(organisationId);
  } catch {
    return { ok: false, error: "Only the organisation owner can change the plan." };
  }

  const plan = SEED_PLANS.find((p) => p.id === planId && p.active);
  if (!plan) return { ok: false, error: "That plan is not available." };
  if (plan.pricePaise <= 0) {
    return {
      ok: false,
      error: `${plan.name} is priced on request — contact support to activate it.`,
    };
  }

  const current = await loadSubscription(organisationId);
  if (current.planId === planId && current.status === "active") {
    return { ok: false, error: `You are already on ${plan.name}.` };
  }

  const admin = requireAdmin();
  const { data: org } = await admin
    .from("organisations")
    .select("name")
    .eq("id", organisationId)
    .maybeSingle();

  try {
    const providerPlanId = await ensureProviderPlan(plan.id);
    const subscription = await provider.createSubscription({
      organisationId,
      plan: {
        planId: plan.id,
        name: plan.name,
        pricePaise: plan.pricePaise,
        billingPeriod: plan.billingPeriod,
      },
      providerPlanId,
      // Keep the remaining trial: authorise now, first charge at trial end.
      startAt:
        current.status === "trialing" ? current.trialEndsAt : undefined,
      customer: { name: user.name, email: user.email },
    });

    // Remember the intent so a webhook that arrives before the browser callback
    // can still tell which plan was being bought.
    await admin
      .from("subscriptions")
      .update({
        pending_plan_id: plan.id,
        provider: provider.name,
        provider_subscription_id: subscription.providerSubscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq("organisation_id", organisationId);

    return {
      ok: true,
      providerSubscriptionId: subscription.providerSubscriptionId,
      publishableKey: provider.publishableKey(),
      planId: plan.id,
      planName: plan.name,
      amountPaise: plan.pricePaise,
      shortUrl: subscription.shortUrl,
      prefill: { name: user.name, email: user.email },
      organisationName: org?.name ?? "Pumpline",
    };
  } catch (err) {
    if (err instanceof BillingProviderError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}

export interface ConfirmCheckoutInput {
  organisationId: string;
  providerSubscriptionId: string;
  providerPaymentId: string;
  signature: string;
}

export interface ConfirmCheckoutResult {
  ok: boolean;
  error?: string;
  planId?: string;
  status?: string;
  /** True when payment succeeded but activation is still pending at the bank. */
  pending?: boolean;
}

/**
 * Handle the payment sheet's success callback. Verifies the provider signature,
 * then re-reads the subscription from the provider and applies THAT — the
 * callback itself never decides an entitlement.
 */
export async function confirmPlanCheckout(
  input: ConfirmCheckoutInput,
): Promise<ConfirmCheckoutResult> {
  if (!isAdminConfigured()) {
    return { ok: false, error: "Backend not configured." };
  }

  try {
    await authoriseBilling(input.organisationId);
  } catch {
    return { ok: false, error: "Not authorised to change this plan." };
  }

  const provider = getBillingProvider();
  const signatureValid = provider.verifyCheckoutSignature({
    providerSubscriptionId: input.providerSubscriptionId,
    providerPaymentId: input.providerPaymentId,
    signature: input.signature,
  });
  if (!signatureValid) {
    return { ok: false, error: "Payment could not be verified." };
  }

  const admin = requireAdmin();

  // The subscription must be the one WE started for this org — otherwise a
  // valid signature from another merchant flow could be replayed here.
  const { data: row } = await admin
    .from("subscriptions")
    .select("provider_subscription_id, pending_plan_id")
    .eq("organisation_id", input.organisationId)
    .maybeSingle();

  if (row?.provider_subscription_id !== input.providerSubscriptionId) {
    return { ok: false, error: "This payment does not belong to your organisation." };
  }

  try {
    const state = await provider.fetchSubscription(input.providerSubscriptionId);
    const result = await applyProviderState(input.organisationId, state, {
      occurredAt: new Date().toISOString(),
      planIdHint: row?.pending_plan_id ?? undefined,
    });

    return {
      ok: true,
      planId: result.planId,
      status: result.status,
      // A mandate can be authenticated before the first charge settles; the
      // webhook flips it to active when it does.
      pending: state.status !== "active",
    };
  } catch (err) {
    if (err instanceof BillingProviderError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Could not confirm the payment." };
  }
}

export interface CancelResult {
  ok: boolean;
  error?: string;
  status?: string;
}

/** Owner-initiated cancellation. Access continues until the period ends. */
export async function cancelPlanAtPeriodEnd(
  organisationId: string,
): Promise<CancelResult> {
  if (!isAdminConfigured()) {
    return { ok: false, error: "Backend not configured." };
  }

  try {
    await authoriseBilling(organisationId);
  } catch {
    return { ok: false, error: "Only the organisation owner can cancel." };
  }

  const { data: row } = await requireAdmin()
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (!row?.provider_subscription_id) {
    return { ok: false, error: "There is no paid subscription to cancel." };
  }

  try {
    const state = await getBillingProvider().cancelSubscription(
      row.provider_subscription_id,
      { atPeriodEnd: true },
    );
    await applyProviderState(organisationId, state, {
      occurredAt: new Date().toISOString(),
    });
    return { ok: true, status: state.status };
  } catch (err) {
    if (err instanceof BillingProviderError) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Could not cancel the subscription." };
  }
}
