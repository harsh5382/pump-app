// ───────────────────────────────────────────────────────────────────────────
// Legacy single-tenant role (kept for back-compat during migration).
// New code must use OrganisationRole / OutletRole + the capability matrix.
// ───────────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "manager" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  /** @deprecated global role — superseded by per-org/per-outlet memberships */
  role?: UserRole;
  phone?: string;
  /** Accepted Terms/Privacy versions (onboarding gate) */
  acceptedTermsVersion?: string;
  acceptedPrivacyVersion?: string;
  createdAt: string;
  updatedAt: string;
}

// ───────────────────────────────────────────────────────────────────────────
// SaaS identity & tenancy model
// organisations/{orgId}/outlets/{outletId}/... (see SAAS_REBUILD_MASTER_PROMPT.md)
// ───────────────────────────────────────────────────────────────────────────

/** Money is always stored as integer paise. Never use floats for currency. */
export type Paise = number;

/** Platform-level role, granted ONLY via Admin SDK custom claim. */
export type PlatformRole = "platform_super_admin";

/** Roles scoped to a whole organisation. `member` = belongs to the org but
 *  holds authority only through outlet-level roles (e.g. a pump manager). */
export type OrganisationRole =
  | "organisation_owner"
  | "organisation_admin"
  | "accountant"
  | "auditor"
  | "member";

/** Roles scoped to a single outlet. */
export type OutletRole =
  | "outlet_admin"
  | "manager"
  | "operator"
  | "accountant"
  | "auditor";

export type MembershipStatus = "invited" | "active" | "suspended" | "removed";

export type OrganisationStatus = "active" | "suspended" | "closed";

export interface Organisation {
  id: string;
  name: string;
  /** Optional GST identification number */
  gstin?: string;
  ownerUid: string;
  status: OrganisationStatus;
  /** BCP-47 locale, default "en-IN" */
  locale: string;
  createdAt: string;
  updatedAt: string;
}

export interface Outlet {
  id: string;
  /** Short human code, e.g. "MUM-01" */
  code: string;
  name: string;
  /** Oil marketing company brand, e.g. "IOCL" | "BPCL" | "HPCL" */
  omcBrand?: string;
  address?: string;
  state?: string;
  /** IANA time zone used to derive the business date, default "Asia/Kolkata" */
  timeZone: string;
  /** Hour (0-23, outlet-local) at which the business day rolls over. Default 0. */
  businessDayCutoverHour: number;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

/** organisations/{orgId}/members/{uid} */
export interface OrganisationMembership {
  uid: string;
  email: string;
  displayName: string;
  organisationRole: OrganisationRole;
  status: MembershipStatus;
  invitedBy?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** organisations/{orgId}/outlets/{outletId}/members/{uid} */
export interface OutletMembership {
  uid: string;
  outletRole: OutletRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

/** users/{uid}/accessIndex/{orgId} — server-maintained summary for the switcher */
export interface AccessIndexEntry {
  organisationId: string;
  organisationName: string;
  organisationRole: OrganisationRole;
  /** outletId -> outletRole for outlets this user can access */
  outletRoles: Record<string, OutletRole>;
  updatedAt: string;
}

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

/** organisations/{orgId}/invitations/{invId} — token is stored hashed, never plain */
export interface Invitation {
  id: string;
  organisationId: string;
  /** SHA-256 hash of the single-use token; the plain token is only ever emailed */
  tokenHash: string;
  email: string;
  phone?: string;
  organisationRole: OrganisationRole;
  /** outletId -> role assignments granted on acceptance */
  outletRoles: Record<string, OutletRole>;
  status: InvitationStatus;
  invitedBy: string;
  /** ISO timestamp; acceptance after this is rejected */
  expiresAt: string;
  acceptedByUid?: string;
  acceptedAt?: string;
  createdAt: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Subscriptions & billing (Razorpay)
// ───────────────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "grace_period"
  | "suspended"
  | "cancelled_at_period_end"
  | "cancelled";

export interface Entitlements {
  maxOutlets: number;
  maxMembers: number;
  maxManagers: number;
  reportHistoryDays: number;
  excelExport: boolean;
  pdfExport: boolean;
  whatsappAlerts: boolean;
  accountingExport: boolean;
  apiAccess: boolean;
  offlineSync: boolean;
  supportLevel: "community" | "email" | "priority";
}

/** plans/{planId} — data-driven, editable only by super-admin */
export interface Plan {
  id: string;
  name: string;
  /** Price in integer paise for the billing period */
  pricePaise: Paise;
  billingPeriod: "monthly" | "annual";
  trialDays: number;
  entitlements: Entitlements;
  /** Razorpay plan id, kept out of the domain logic */
  providerPlanId?: string;
  active: boolean;
  createdAt: string;
}

/** subscriptions/{orgId} */
export interface Subscription {
  organisationId: string;
  planId: string;
  status: SubscriptionStatus;
  /** Snapshot of entitlements at provisioning time (server-authoritative) */
  entitlements: Entitlements;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  graceEndsAt?: string;
  /** Razorpay identifiers (server-only writes) */
  providerCustomerId?: string;
  providerSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

/** billingWebhookEvents/{providerEventId} — idempotency guard for webhooks */
export interface BillingWebhookEvent {
  providerEventId: string;
  type: string;
  organisationId?: string;
  receivedAt: string;
  processedAt?: string;
  status: "received" | "processed" | "ignored" | "failed";
}

export interface FuelType {
  id: string;
  name: string;
  unit: string;
  createdAt: string;
}

export interface Tank {
  id: string;
  name: string;
  fuelTypeId: string;
  capacityLiters: number;
  currentStockLiters: number;
  createdAt: string;
  updatedAt: string;
}

export interface DipEntry {
  id: string;
  tankId: string;
  date: string;
  dipReading: number;
  actualQuantity: number;
  expectedQuantity: number;
  lossOrGain: number; // positive = gain, negative = loss
  enteredBy: string;
  createdAt: string;
}

export interface Nozzle {
  id: string;
  machineNumber: string;
  fuelTypeId: string;
  tankId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeterReading {
  id: string;
  nozzleId: string;
  date: string;
  openingMeter: number;
  closingMeter: number;
  fuelSold: number; // closing - opening
  enteredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TankerDelivery {
  id: string;
  date: string;
  tankerCompany: string;
  invoiceNumber: string;
  fuelTypeId: string;
  tankId: string;
  quantityLiters: number;
  enteredBy: string;
  createdAt: string;
}

export type PaymentType = "cash" | "upi" | "credit_card" | "fleet_card" | "credit_customer";

export interface PaymentEntry {
  id: string;
  date: string;
  paymentType: PaymentType;
  amount: number;
  notes?: string;
  enteredBy: string;
  createdAt: string;
}

export interface DailySaleCorrection {
  id: string;
  date: string;
  fuelTypeId: string;
  correctionLiters: number;
  reason: string;
  enteredBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string; // generator_diesel | maintenance | cleaning | salary_advance | other
  amount: number;
  description: string;
  enteredBy: string;
  createdAt: string;
}

export interface StaffShift {
  id: string;
  staffName: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  assignedNozzleIds: string[];
  cashCollected: number;
  enteredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: "low_stock" | "meter_not_entered" | "payment_mismatch" | "info";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId?: string; // if user-specific
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: string;
  createdAt: string;
}
