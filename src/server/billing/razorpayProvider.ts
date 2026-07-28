import "server-only";

import crypto from "node:crypto";
import Razorpay from "razorpay";
import type { SubscriptionStatus } from "@/types";
import {
  BillingProviderError,
  type BillingProvider,
  type CheckoutSignature,
  type CreateSubscriptionInput,
  type ProviderCharge,
  type ProviderEvent,
  type ProviderPlanSpec,
  type ProviderSubscriptionRef,
  type ProviderSubscriptionState,
} from "./provider";

// ───────────────────────────────────────────────────────────────────────────
// Razorpay Subscriptions adapter.
//
// This is the ONLY file that knows Razorpay's field names. It translates both
// ways: domain -> API calls, and API/webhook payloads -> domain state.
//
// Credentials are read lazily so the app boots (and builds) without them; every
// entry point is guarded by isConfigured(). Nothing here trusts the browser.
// ───────────────────────────────────────────────────────────────────────────

/** How many billing cycles to authorise up front. 10 years of monthly. */
const TOTAL_COUNT_MONTHLY = 120;
const TOTAL_COUNT_ANNUAL = 10;

let cached: Razorpay | null = null;

function keyId() {
  return process.env.RAZORPAY_KEY_ID ?? "";
}
function keySecret() {
  return process.env.RAZORPAY_KEY_SECRET ?? "";
}
function webhookSecret() {
  return process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
}

function client(): Razorpay {
  if (cached) return cached;
  if (!keyId() || !keySecret()) {
    throw new BillingProviderError(
      "Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
    );
  }
  cached = new Razorpay({ key_id: keyId(), key_secret: keySecret() });
  return cached;
}

/** Constant-time compare so a signature check can't be probed by timing. */
function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hmac(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function toIso(unixSeconds?: number | null): string | undefined {
  if (!unixSeconds) return undefined;
  return new Date(unixSeconds * 1000).toISOString();
}

// ── Status mapping ─────────────────────────────────────────────────────────
// Razorpay:  created | authenticated | active | pending | halted
//            | cancelled | completed | expired | paused
//
// `pending` means a charge failed and Razorpay is still retrying → past_due.
// `halted` means retries are exhausted → grace_period; the domain suspends the
// org once graceEndsAt passes (see entitlements.loadSubscription).
const STATUS_MAP: Record<string, SubscriptionStatus> = {
  created: "trialing",
  authenticated: "trialing",
  active: "active",
  pending: "past_due",
  halted: "grace_period",
  paused: "suspended",
  cancelled: "cancelled",
  completed: "cancelled",
  expired: "cancelled",
};

function mapStatus(providerStatus: string): SubscriptionStatus {
  return STATUS_MAP[providerStatus] ?? "past_due";
}

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id?: string;
  status: string;
  current_end?: number | null;
  ended_at?: number | null;
  customer_id?: string | null;
  short_url?: string;
  notes?: Record<string, string> | unknown;
}

function mapSubscription(
  sub: RazorpaySubscriptionEntity,
): ProviderSubscriptionState {
  return {
    providerSubscriptionId: sub.id,
    status: mapStatus(sub.status),
    providerStatus: sub.status,
    currentPeriodEnd: toIso(sub.current_end),
    cancelledAt: sub.status === "cancelled" ? toIso(sub.ended_at) : undefined,
    providerCustomerId: sub.customer_id ?? undefined,
    providerPlanId: sub.plan_id,
  };
}

function notesOrganisationId(notes: unknown): string | undefined {
  if (!notes || typeof notes !== "object") return undefined;
  const value = (notes as Record<string, unknown>).organisationId;
  return typeof value === "string" && value ? value : undefined;
}

export const razorpayProvider: BillingProvider = {
  name: "razorpay",

  isConfigured() {
    return Boolean(keyId() && keySecret());
  },

  publishableKey() {
    return keyId();
  },

  webhooksConfigured() {
    return Boolean(webhookSecret());
  },

  // Razorpay plans are immutable, so "ensure" means: create one for this
  // (plan, period, price) triple. The caller caches the returned id in
  // billing_provider_plans, so this runs once per priced plan, not per checkout.
  async ensurePlan(plan: ProviderPlanSpec): Promise<string> {
    if (plan.pricePaise <= 0) {
      throw new BillingProviderError(
        `Plan "${plan.planId}" has no price — it cannot be bought online.`,
      );
    }
    try {
      const created = await client().plans.create({
        period: plan.billingPeriod === "annual" ? "yearly" : "monthly",
        interval: 1,
        item: {
          name: `Pumpline ${plan.name}`,
          amount: plan.pricePaise,
          currency: "INR",
          description: `Pumpline ${plan.name} — ${plan.billingPeriod} subscription`,
        },
        notes: { planId: plan.planId },
      });
      return created.id;
    } catch (err) {
      throw new BillingProviderError("Could not create the plan at Razorpay.", err);
    }
  },

  async createSubscription(
    input: CreateSubscriptionInput,
  ): Promise<ProviderSubscriptionRef> {
    // start_at lets a mid-trial upgrade keep the remaining trial days: the
    // mandate is authorised now, the first charge lands when the trial ends.
    const startAtSeconds = input.startAt
      ? Math.floor(new Date(input.startAt).getTime() / 1000)
      : undefined;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const startAt =
      startAtSeconds && startAtSeconds > nowSeconds + 300
        ? startAtSeconds
        : undefined;

    try {
      const sub = await client().subscriptions.create({
        plan_id: input.providerPlanId,
        total_count:
          input.plan.billingPeriod === "annual"
            ? TOTAL_COUNT_ANNUAL
            : TOTAL_COUNT_MONTHLY,
        quantity: 1,
        customer_notify: 1,
        ...(startAt ? { start_at: startAt } : {}),
        notes: {
          // Round-tripped through Razorpay so webhooks can be attributed to a
          // tenant without trusting anything the browser sends.
          organisationId: input.organisationId,
          planId: input.plan.planId,
        },
      });
      return { providerSubscriptionId: sub.id, shortUrl: sub.short_url };
    } catch (err) {
      throw new BillingProviderError(
        "Could not start the subscription at Razorpay.",
        err,
      );
    }
  },

  async fetchSubscription(id: string): Promise<ProviderSubscriptionState> {
    try {
      const sub = await client().subscriptions.fetch(id);
      return mapSubscription(sub as unknown as RazorpaySubscriptionEntity);
    } catch (err) {
      throw new BillingProviderError(
        "Could not read the subscription from Razorpay.",
        err,
      );
    }
  },

  async cancelSubscription(
    id: string,
    opts: { atPeriodEnd: boolean },
  ): Promise<ProviderSubscriptionState> {
    try {
      const sub = await client().subscriptions.cancel(id, opts.atPeriodEnd);
      const state = mapSubscription(sub as unknown as RazorpaySubscriptionEntity);
      // Razorpay keeps status `active` for a cycle-end cancellation; the domain
      // needs the distinct "will not renew" state so the UI can say so.
      if (opts.atPeriodEnd && state.status === "active") {
        return { ...state, status: "cancelled_at_period_end" };
      }
      return state;
    } catch (err) {
      throw new BillingProviderError(
        "Could not cancel the subscription at Razorpay.",
        err,
      );
    }
  },

  // Checkout success callback. For SUBSCRIPTIONS the signed payload is
  // `payment_id|subscription_id` (orders use the opposite order) and it is
  // signed with the API key secret, not the webhook secret.
  verifyCheckoutSignature(sig: CheckoutSignature): boolean {
    if (!keySecret()) return false;
    if (!sig.providerPaymentId || !sig.providerSubscriptionId || !sig.signature) {
      return false;
    }
    const expected = hmac(
      `${sig.providerPaymentId}|${sig.providerSubscriptionId}`,
      keySecret(),
    );
    return safeEqualHex(expected, sig.signature);
  },

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = webhookSecret();
    if (!secret || !signature) return false;
    return safeEqualHex(hmac(rawBody, secret), signature);
  },

  parseEvent(rawBody: string, headers: Headers): ProviderEvent | null {
    let body: {
      event?: string;
      created_at?: number;
      payload?: {
        subscription?: { entity?: RazorpaySubscriptionEntity };
        payment?: { entity?: Record<string, unknown> };
        invoice?: { entity?: Record<string, unknown> };
      };
    };
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }
    if (!body?.event) return null;

    // Razorpay's own event id header — the idempotency key. Fall back to a
    // digest of the body so a missing header can't turn into unbounded replays.
    const eventId =
      headers.get("x-razorpay-event-id") ??
      crypto.createHash("sha256").update(rawBody).digest("hex");

    const subEntity = body.payload?.subscription?.entity;
    const paymentEntity = body.payload?.payment?.entity;
    const invoiceEntity = body.payload?.invoice?.entity;

    const subscription = subEntity ? mapSubscription(subEntity) : undefined;

    let charge: ProviderCharge | undefined;
    if (paymentEntity || invoiceEntity) {
      const paid = paymentEntity?.status === "captured";
      const failed =
        paymentEntity?.status === "failed" || body.event === "payment.failed";
      const amount =
        (typeof invoiceEntity?.amount === "number"
          ? invoiceEntity.amount
          : undefined) ??
        (typeof paymentEntity?.amount === "number" ? paymentEntity.amount : 0);

      charge = {
        providerInvoiceId:
          typeof invoiceEntity?.id === "string" ? invoiceEntity.id : undefined,
        providerPaymentId:
          typeof paymentEntity?.id === "string" ? paymentEntity.id : undefined,
        amountPaise: amount,
        currency:
          (typeof paymentEntity?.currency === "string"
            ? paymentEntity.currency
            : undefined) ?? "INR",
        status: paid ? "paid" : failed ? "failed" : "issued",
        description:
          typeof paymentEntity?.description === "string"
            ? paymentEntity.description
            : undefined,
        invoiceUrl:
          typeof invoiceEntity?.short_url === "string"
            ? invoiceEntity.short_url
            : undefined,
        issuedAt:
          typeof invoiceEntity?.issued_at === "number"
            ? toIso(invoiceEntity.issued_at)
            : undefined,
        paidAt: paid
          ? toIso(
              typeof paymentEntity?.created_at === "number"
                ? paymentEntity.created_at
                : undefined,
            )
          : undefined,
      };
    }

    return {
      id: eventId,
      type: body.event,
      occurredAt: toIso(body.created_at) ?? new Date().toISOString(),
      organisationId: notesOrganisationId(
        subEntity?.notes ?? (paymentEntity?.notes as unknown),
      ),
      subscription,
      charge,
    };
  },
};
