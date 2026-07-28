import { NextResponse } from "next/server";
import { getAdmin } from "@/server/supabaseAdmin";
import {
  applyProviderState,
  getBillingProvider,
  recordCharge,
  resolveOrganisationId,
} from "@/server/billing/subscriptionState";

// ───────────────────────────────────────────────────────────────────────────
// Billing webhook — the authoritative channel for subscription truth.
//
// Order of operations matters and is deliberate:
//   1. read the RAW body (parsing first would break the signature),
//   2. verify the signature — unsigned bodies never reach any logic,
//   3. claim the event id in billing_webhook_events (PK insert). A duplicate
//      delivery collides here and returns before touching entitlements, which
//      is what makes replays inert,
//   4. apply the normalised state, which itself drops out-of-order events.
//
// We answer 200 for anything we accepted-or-already-had so the provider stops
// retrying, and non-2xx only when we want the retry.
// ───────────────────────────────────────────────────────────────────────────

// Signature verification needs the byte-exact body; no static optimisation.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const provider = getBillingProvider();

  // Fail closed: with no webhook secret configured, nothing can be trusted.
  if (!provider.webhooksConfigured()) {
    return NextResponse.json(
      { error: "Webhooks are not configured." },
      { status: 503 },
    );
  }

  const admin = getAdmin();
  if (!admin) {
    // Retryable: our backend is misconfigured, the event itself may be fine.
    return NextResponse.json({ error: "Backend unavailable." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  const event = provider.parseEvent(rawBody, request.headers);
  if (!event) {
    // Signed but unreadable — retrying will not help.
    return NextResponse.json({ error: "Malformed event." }, { status: 400 });
  }

  const organisationId = await resolveOrganisationId(event);

  // Idempotency claim. The primary key is the replay defence.
  const { error: claimError } = await admin
    .from("billing_webhook_events")
    .insert({
      provider_event_id: event.id,
      provider: provider.name,
      event_type: event.type,
      organisation_id: organisationId ?? null,
      status: "received",
      payload: JSON.parse(rawBody),
      event_at: event.occurredAt,
    });

  if (claimError) {
    // 23505 = already processed this exact event. Acknowledge and stop.
    if (claimError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  const finish = async (
    status: "processed" | "ignored" | "failed",
    error?: string,
  ) => {
    await admin
      .from("billing_webhook_events")
      .update({
        status,
        error: error ?? null,
        processed_at: new Date().toISOString(),
        organisation_id: organisationId ?? null,
      })
      .eq("provider_event_id", event.id);
  };

  if (!organisationId) {
    // Not ours (or a merchant-level event) — recorded, deliberately not acted on.
    await finish("ignored", "No organisation could be resolved for this event.");
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    let planId: string | undefined;

    if (event.subscription) {
      const result = await applyProviderState(organisationId, event.subscription, {
        occurredAt: event.occurredAt,
      });
      planId = result.planId;
      if (!result.applied && result.reason === "stale") {
        await finish("ignored", "Superseded by a newer event.");
        return NextResponse.json({ ok: true, stale: true });
      }
    }

    if (event.charge) {
      await recordCharge(organisationId, event.charge, {
        planId,
        providerSubscriptionId: event.subscription?.providerSubscriptionId,
      });
    }

    await finish("processed");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await finish("failed", message);
    // 500 asks the provider to retry; the event row stays for reconciliation.
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}
