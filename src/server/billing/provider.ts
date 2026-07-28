import "server-only";

import type { SubscriptionStatus } from "@/types";

// ───────────────────────────────────────────────────────────────────────────
// Payment-provider adapter — the seam between Pumpline's billing domain and
// whichever gateway is charging the card.
//
// NOTHING in this file mentions Razorpay field names. The domain speaks in
// plans, paise, periods and the SubscriptionStatus machine from the spec:
//
//   trialing -> active -> past_due -> grace_period -> suspended
//                       -> cancelled_at_period_end -> cancelled
//
// A second provider (Stripe for non-India, say) means a second implementation
// of BillingProvider, not edits to the callers.
// ───────────────────────────────────────────────────────────────────────────

/** A plan as the provider needs to see it. Prices are integer paise. */
export interface ProviderPlanSpec {
  planId: string;
  name: string;
  pricePaise: number;
  billingPeriod: "monthly" | "annual";
}

export interface CreateSubscriptionInput {
  organisationId: string;
  plan: ProviderPlanSpec;
  /** Provider plan handle from ensurePlan(). */
  providerPlanId: string;
  /** Delay the first charge until this instant (e.g. the end of a trial). */
  startAt?: string;
  customer?: { name?: string; email?: string; contact?: string };
}

export interface ProviderSubscriptionRef {
  providerSubscriptionId: string;
  /** Hosted fallback page, when the provider offers one. */
  shortUrl?: string;
}

/** Provider state normalised into the domain's own vocabulary. */
export interface ProviderSubscriptionState {
  providerSubscriptionId: string;
  status: SubscriptionStatus;
  /** Raw provider status, kept only for diagnostics/audit. */
  providerStatus: string;
  currentPeriodEnd?: string;
  cancelledAt?: string;
  providerCustomerId?: string;
  /** Provider plan handle, so we can resolve which Pumpline plan was bought. */
  providerPlanId?: string;
}

/** A charge the provider reported — drives billing history. */
export interface ProviderCharge {
  providerInvoiceId?: string;
  providerPaymentId?: string;
  amountPaise: number;
  currency: string;
  status: "paid" | "failed" | "issued" | "refunded";
  description?: string;
  invoiceUrl?: string;
  issuedAt?: string;
  paidAt?: string;
}

/** A signature-verified provider event, normalised. */
export interface ProviderEvent {
  /** Provider's own event id — the idempotency key. */
  id: string;
  type: string;
  occurredAt: string;
  /** Our organisation id, round-tripped through provider metadata. */
  organisationId?: string;
  subscription?: ProviderSubscriptionState;
  charge?: ProviderCharge;
}

export interface CheckoutSignature {
  providerSubscriptionId: string;
  providerPaymentId: string;
  signature: string;
}

export interface BillingProvider {
  readonly name: string;
  /** False when credentials are absent — callers must degrade, not throw. */
  isConfigured(): boolean;
  /** Key the browser is allowed to see when opening the payment sheet. */
  publishableKey(): string;

  /** Idempotently create (or reuse) the provider-side plan. */
  ensurePlan(plan: ProviderPlanSpec): Promise<string>;
  createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<ProviderSubscriptionRef>;
  fetchSubscription(
    providerSubscriptionId: string,
  ): Promise<ProviderSubscriptionState>;
  cancelSubscription(
    providerSubscriptionId: string,
    opts: { atPeriodEnd: boolean },
  ): Promise<ProviderSubscriptionState>;

  /** Confirms the browser's success callback really came from the provider. */
  verifyCheckoutSignature(sig: CheckoutSignature): boolean;
  /** Confirms a webhook body was signed with the webhook secret. */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  /** True once a webhook secret is configured; webhooks fail closed without it. */
  webhooksConfigured(): boolean;
  /** Normalise a verified webhook body into a ProviderEvent. */
  parseEvent(rawBody: string, headers: Headers): ProviderEvent | null;
}

/** Thrown for provider-side failures the UI should surface as "try again". */
export class BillingProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "BillingProviderError";
  }
}
