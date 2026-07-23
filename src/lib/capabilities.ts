// ───────────────────────────────────────────────────────────────────────────
// Capability matrix — the single source of truth for "who can do what".
//
// Permissions are expressed as named CAPABILITIES, never as scattered
// role-name string comparisons. The same matrix is used by the UI (to hide
// actions), by server handlers (to authorize), and by Firestore rule tests.
//
// This module is PURE DATA + helpers and is safe to import on the client.
// Actual enforcement (requireCapability) lives server-side in src/server.
// ───────────────────────────────────────────────────────────────────────────

import type { OrganisationRole, OutletRole } from "@/types";

export type Capability =
  // Organisation scope
  | "org.manage_billing"
  | "org.manage_members"
  | "org.manage_outlets"
  | "org.transfer_ownership"
  | "org.view_consolidated_reports"
  | "org.export_data"
  // Outlet configuration
  | "outlet.manage_settings"
  | "outlet.manage_assets" // tanks, nozzles, fuel products & prices
  | "outlet.manage_members"
  // Daily operations
  | "shift.open"
  | "shift.close"
  | "shift.approve"
  | "reading.enter"
  | "reading.edit"
  | "delivery.manage"
  | "payment.manage"
  | "expense.manage"
  | "dip.enter"
  | "credit.manage"
  // Records & reporting
  | "record.delete"
  | "report.view"
  | "report.export"
  | "audit.view";

const ALL_OUTLET_OPS: Capability[] = [
  "outlet.manage_settings",
  "outlet.manage_assets",
  "outlet.manage_members",
  "shift.open",
  "shift.close",
  "shift.approve",
  "reading.enter",
  "reading.edit",
  "delivery.manage",
  "payment.manage",
  "expense.manage",
  "dip.enter",
  "credit.manage",
  "record.delete",
  "report.view",
  "report.export",
  "audit.view",
];

/** Capabilities granted by an organisation-level role (across all its outlets). */
export const ORGANISATION_CAPABILITIES: Record<OrganisationRole, Capability[]> = {
  organisation_owner: [
    "org.manage_billing",
    "org.manage_members",
    "org.manage_outlets",
    "org.transfer_ownership",
    "org.view_consolidated_reports",
    "org.export_data",
    ...ALL_OUTLET_OPS,
  ],
  organisation_admin: [
    "org.manage_members",
    "org.manage_outlets",
    "org.view_consolidated_reports",
    "org.export_data",
    ...ALL_OUTLET_OPS,
  ],
  accountant: [
    "org.view_consolidated_reports",
    "org.export_data",
    "report.view",
    "report.export",
    "payment.manage",
    "expense.manage",
    "credit.manage",
  ],
  auditor: [
    "org.view_consolidated_reports",
    "report.view",
    "report.export",
    "audit.view",
  ],
  // Belongs to the org but gets all authority from outlet-level roles only.
  member: [],
};

/** Capabilities granted by an outlet-level role (for that outlet only). */
export const OUTLET_CAPABILITIES: Record<OutletRole, Capability[]> = {
  outlet_admin: [...ALL_OUTLET_OPS],
  manager: [
    "shift.open",
    "shift.close",
    "shift.approve",
    "reading.enter",
    "reading.edit",
    "delivery.manage",
    "payment.manage",
    "expense.manage",
    "dip.enter",
    "credit.manage",
    "report.view",
    "report.export",
  ],
  operator: [
    "shift.open",
    "reading.enter",
    "delivery.manage",
    "payment.manage",
    "dip.enter",
  ],
  accountant: [
    "payment.manage",
    "expense.manage",
    "credit.manage",
    "report.view",
    "report.export",
  ],
  auditor: ["report.view", "report.export", "audit.view"],
};

export interface EffectiveAccess {
  organisationRole?: OrganisationRole;
  /** Role at the specific outlet currently in context, if any. */
  outletRole?: OutletRole;
}

/**
 * Resolve the set of capabilities a user has for the current org/outlet context.
 * Organisation-level capabilities apply across the org; outlet-level capabilities
 * are added for the outlet the user is currently acting within.
 */
export function resolveCapabilities(access: EffectiveAccess): Set<Capability> {
  const caps = new Set<Capability>();
  if (access.organisationRole) {
    for (const c of ORGANISATION_CAPABILITIES[access.organisationRole]) caps.add(c);
  }
  if (access.outletRole) {
    for (const c of OUTLET_CAPABILITIES[access.outletRole]) caps.add(c);
  }
  return caps;
}

export function hasCapability(
  access: EffectiveAccess,
  capability: Capability,
): boolean {
  return resolveCapabilities(access).has(capability);
}
