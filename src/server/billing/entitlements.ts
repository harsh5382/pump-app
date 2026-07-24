import "server-only";

import { requireAdmin } from "@/server/supabaseAdmin";
import { ENTITLEMENTS, TRIAL_PLAN_ID } from "@/lib/plans";
import type { Entitlements, SubscriptionStatus } from "@/types";

// ───────────────────────────────────────────────────────────────────────────
// Entitlement enforcement — the commercial boundary of the product.
//
// Plan limits are SNAPSHOT onto subscriptions.entitlements at provisioning and
// updated by the billing webhook. They are enforced HERE, server-side, before
// any action that consumes a limited resource (members, outlets). The UI also
// surfaces usage, but the UI is not the enforcement point.
//
// Reads use the service-role client because subscriptions / members / outlets
// are service-role-only tables (see 0001_init.sql).
// ───────────────────────────────────────────────────────────────────────────

/** Statuses that may still USE the product (read + write). */
const USABLE_STATUSES: SubscriptionStatus[] = [
  "trialing",
  "active",
  "past_due",
  "grace_period",
  "cancelled_at_period_end",
];

export class EntitlementError extends Error {
  /** Machine-readable reason so the UI can render the right upgrade CTA. */
  readonly reason:
    | "member_limit"
    | "manager_limit"
    | "outlet_limit"
    | "subscription_inactive";
  readonly limit?: number;
  readonly current?: number;

  constructor(
    reason: EntitlementError["reason"],
    message: string,
    opts?: { limit?: number; current?: number },
  ) {
    super(message);
    this.name = "EntitlementError";
    this.reason = reason;
    this.limit = opts?.limit;
    this.current = opts?.current;
  }
}

export interface OrgSubscription {
  planId: string;
  status: SubscriptionStatus;
  entitlements: Entitlements;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  graceEndsAt?: string;
}

/**
 * Load an organisation's subscription. Falls back to the trial plan's
 * entitlements if the row is missing or has no snapshot, so the app degrades
 * to the most restrictive plan rather than to "unlimited".
 */
export async function loadSubscription(
  organisationId: string,
): Promise<OrgSubscription> {
  const { data, error } = await requireAdmin()
    .from("subscriptions")
    .select("*")
    .eq("organisation_id", organisationId)
    .maybeSingle();

  if (error || !data) {
    return {
      planId: TRIAL_PLAN_ID,
      status: "trialing",
      entitlements: ENTITLEMENTS.trial,
    };
  }

  return {
    planId: data.plan_id,
    status: data.status as SubscriptionStatus,
    entitlements: (data.entitlements as Entitlements) ?? ENTITLEMENTS.trial,
    trialEndsAt: data.trial_ends_at ?? undefined,
    currentPeriodEnd: data.current_period_end ?? undefined,
    graceEndsAt: data.grace_ends_at ?? undefined,
  };
}

export interface OrgUsage {
  /** Active org members + still-pending invitations (an invite reserves a seat). */
  members: number;
  /** Active outlet members holding the `manager` outlet role. */
  managers: number;
  /** Active (non-archived) outlets. */
  outlets: number;
}

export async function getOrgUsage(organisationId: string): Promise<OrgUsage> {
  const admin = requireAdmin();

  const [members, pendingInvites, managers, outlets] = await Promise.all([
    admin
      .from("organisation_members")
      .select("uid", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("status", "active"),
    admin
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("status", "pending"),
    admin
      .from("outlet_members")
      .select("uid", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("status", "active")
      .eq("outlet_role", "manager"),
    admin
      .from("outlets")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("status", "active"),
  ]);

  return {
    members: (members.count ?? 0) + (pendingInvites.count ?? 0),
    managers: managers.count ?? 0,
    outlets: outlets.count ?? 0,
  };
}

/** Combined snapshot used by the billing page and the assert helpers. */
export interface EntitlementSnapshot {
  subscription: OrgSubscription;
  usage: OrgUsage;
}

export async function getEntitlementSnapshot(
  organisationId: string,
): Promise<EntitlementSnapshot> {
  const [subscription, usage] = await Promise.all([
    loadSubscription(organisationId),
    getOrgUsage(organisationId),
  ]);
  return { subscription, usage };
}

/** Throws when the subscription is suspended/cancelled (dunning end-state). */
export function assertSubscriptionUsable(sub: OrgSubscription): void {
  if (!USABLE_STATUSES.includes(sub.status)) {
    throw new EntitlementError(
      "subscription_inactive",
      "This organisation's subscription is not active. Renew the plan to continue.",
    );
  }
}

/**
 * Throws unless another member can be added (seat = active member or pending
 * invite). `invitingManager` additionally checks the manager sub-limit.
 */
export async function assertCanAddMember(
  organisationId: string,
  opts?: { invitingManager?: boolean },
): Promise<EntitlementSnapshot> {
  const snapshot = await getEntitlementSnapshot(organisationId);
  const { subscription, usage } = snapshot;
  assertSubscriptionUsable(subscription);

  const { maxMembers, maxManagers } = subscription.entitlements;

  if (usage.members >= maxMembers) {
    throw new EntitlementError(
      "member_limit",
      `Your ${subscription.planId} plan includes ${maxMembers} team members and you're using ${usage.members}. Upgrade to invite more.`,
      { limit: maxMembers, current: usage.members },
    );
  }

  if (opts?.invitingManager && usage.managers >= maxManagers) {
    throw new EntitlementError(
      "manager_limit",
      `Your ${subscription.planId} plan includes ${maxManagers} managers and you're using ${usage.managers}. Upgrade to add more.`,
      { limit: maxManagers, current: usage.managers },
    );
  }

  return snapshot;
}

/** Throws unless another outlet can be created under the current plan. */
export async function assertCanAddOutlet(
  organisationId: string,
): Promise<EntitlementSnapshot> {
  const snapshot = await getEntitlementSnapshot(organisationId);
  const { subscription, usage } = snapshot;
  assertSubscriptionUsable(subscription);

  const { maxOutlets } = subscription.entitlements;
  if (usage.outlets >= maxOutlets) {
    throw new EntitlementError(
      "outlet_limit",
      `Your ${subscription.planId} plan includes ${maxOutlets} outlet${maxOutlets === 1 ? "" : "s"} and you're using ${usage.outlets}. Upgrade to add another.`,
      { limit: maxOutlets, current: usage.outlets },
    );
  }

  return snapshot;
}
