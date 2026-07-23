import type { Entitlements, Plan } from "@/types";

// ───────────────────────────────────────────────────────────────────────────
// Seed plan & entitlement definitions.
//
// These are the DEFAULTS used to bootstrap the plans/{planId} collection and to
// snapshot entitlements onto a subscription at provisioning time. Once seeded,
// plans are editable by the super-admin and the database copy is authoritative.
// Prices are integer paise. Names/prices are business decisions — keep configurable.
// ───────────────────────────────────────────────────────────────────────────

export const TRIAL_PLAN_ID = "trial";

export const ENTITLEMENTS: Record<string, Entitlements> = {
  trial: {
    maxOutlets: 1,
    maxMembers: 5,
    maxManagers: 2,
    reportHistoryDays: 90,
    excelExport: true,
    pdfExport: true,
    whatsappAlerts: false,
    accountingExport: false,
    apiAccess: false,
    offlineSync: false,
    supportLevel: "community",
  },
  starter: {
    maxOutlets: 1,
    maxMembers: 8,
    maxManagers: 3,
    reportHistoryDays: 365,
    excelExport: true,
    pdfExport: true,
    whatsappAlerts: true,
    accountingExport: false,
    apiAccess: false,
    offlineSync: true,
    supportLevel: "email",
  },
  growth: {
    maxOutlets: 5,
    maxMembers: 30,
    maxManagers: 10,
    reportHistoryDays: 1095,
    excelExport: true,
    pdfExport: true,
    whatsappAlerts: true,
    accountingExport: true,
    apiAccess: false,
    offlineSync: true,
    supportLevel: "email",
  },
  enterprise: {
    maxOutlets: 100,
    maxMembers: 500,
    maxManagers: 200,
    reportHistoryDays: 3650,
    excelExport: true,
    pdfExport: true,
    whatsappAlerts: true,
    accountingExport: true,
    apiAccess: true,
    offlineSync: true,
    supportLevel: "priority",
  },
};

/** Seed plans (without timestamps — stamped on write). */
export const SEED_PLANS: Omit<Plan, "createdAt">[] = [
  {
    id: "trial",
    name: "Trial",
    pricePaise: 0,
    billingPeriod: "monthly",
    trialDays: 14,
    entitlements: ENTITLEMENTS.trial,
    active: true,
  },
  {
    id: "starter",
    name: "Starter",
    pricePaise: 49900, // ₹499
    billingPeriod: "monthly",
    trialDays: 14,
    entitlements: ENTITLEMENTS.starter,
    active: true,
  },
  {
    id: "growth",
    name: "Growth",
    pricePaise: 149900, // ₹1,499
    billingPeriod: "monthly",
    trialDays: 14,
    entitlements: ENTITLEMENTS.growth,
    active: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    pricePaise: 0, // negotiated
    billingPeriod: "monthly",
    trialDays: 14,
    entitlements: ENTITLEMENTS.enterprise,
    active: true,
  },
];

export function rupeesFromPaise(paise: number): string {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}
