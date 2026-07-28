// ───────────────────────────────────────────────────────────────────────────
// Active-outlet context for the client data layer.
//
// The dashboard always operates within exactly one "current outlet". OrgContext
// resolves it and calls setActiveOutletId() whenever it changes; db.ts reads it
// via requireOutletId() so every query is scoped to that outlet WITHOUT having
// to thread outletId through all 40+ call sites.
//
// Safety: the dashboard shell (OnboardingGuard) does not render pages until an
// outlet is active, and remounts the page subtree when it changes — so a data
// call never fires without a set outlet. requireOutletId() throws loudly if it
// somehow does, rather than silently reading/writing across tenants.
//
// RLS (is_outlet_member) is the real enforcement; this is the app-side scoping.
// ───────────────────────────────────────────────────────────────────────────

let activeOutletId: string | null = null;

export function setActiveOutletId(id: string | null): void {
  activeOutletId = id;
}

export function getActiveOutletId(): string | null {
  return activeOutletId;
}

export function requireOutletId(): string {
  if (!activeOutletId) {
    throw new Error(
      "No outlet selected. Data operations must run within an active outlet.",
    );
  }
  return activeOutletId;
}
