# Pumpline SaaS Rebuild: Project Analysis and Master Implementation Prompt

Date prepared: 28 June 2026

This document has two parts:

1. A concise audit of the current repository and the product gaps found through market research.
2. A copy-ready master prompt for rebuilding Pumpline as a secure, subscription-based, multi-tenant SaaS.

---

## Part 1: Current-project analysis

### Executive conclusion

The current app is a useful single-pump prototype, but it is not safe to expose as a public SaaS. The UI already covers several core forecourt records, but the identity model, database layout, authorization rules, and billing architecture assume one shared installation.

The next version must be designed around this hierarchy:

```text
Pumpline platform
  -> subscribing organisation / petrol-pump business
      -> one or more pump outlets
          -> outlet-specific admins, managers, operators, assets, shifts and transactions
```

“Admin” must no longer mean a global administrator. A pump business gets its own private organisation and users receive explicit access only to that organisation and its selected outlets. Pumpline's internal super admin is a separate platform role.

### What exists today

The repository is a Next.js 14, React 18, TypeScript and Firebase application. It currently includes:

- Public landing, pricing, login and signup pages.
- Firebase email/password authentication.
- Roles named `admin`, `manager` and `staff`.
- Fuel types, tanks, nozzles, meter readings and dip entries.
- Tanker deliveries, payments, expenses and staff shifts.
- Dashboard summaries, notifications and basic Excel/PDF reports.
- PWA shell and offline fallback page.

These are good foundations to preserve during the migration.

### Critical blockers before public launch

#### 1. There is no tenant or pump boundary

All operational collections are global (`tanks`, `nozzles`, `meterReadings`, `payments`, and so on). Records do not carry an organisation or outlet identity. A signed-in user can therefore query records belonging to every future customer.

#### 2. Firestore rules expose all customer data to every signed-in user

Most collections grant read or create access to any authenticated account. All signed-in users can also read all user profiles. The existing `admin` check is global, not organisation-specific.

#### 3. Public signup can be abused to become a global admin

The browser decides whether a registrant is the “first user.” More seriously, the rules allow a user to create their own profile without restricting the submitted role. A malicious client can create its own profile with `role: admin` and receive global admin rights.

#### 4. Creating a team member uses the wrong Firebase API

The current admin screen calls the client `createUserWithEmailAndPassword` method. That signs the browser in as the newly created user and replaces the administrator's current session. Team provisioning must run on a trusted server through the Firebase Admin SDK or use an invitation flow.

#### 5. Deleting a profile does not delete or disable the Auth account

The app deletes only the Firestore user document. The deleted person can sign in again and the fallback code recreates a staff profile. Removing a member must revoke sessions and disable/delete the Auth identity through a trusted server.

#### 6. Authorization fails open

If a Firestore profile read fails, the client invents an in-memory staff profile and continues. A production authorization system must fail closed. Navigation hiding is not security; server actions and Firestore rules must enforce every permission.

#### 7. The current static deployment cannot securely implement SaaS administration

`next.config.js` uses `output: "export"`, while the server auth file is only a placeholder. Secure user provisioning, invitation acceptance, payment-provider secrets, signed billing webhooks, session verification and super-admin operations require a trusted backend. Use a hosted Next.js runtime or separate Firebase/Google Cloud Functions.

#### 8. Stock and financial calculations are not ledger-grade

- Tanker creation and tank-stock updates are separate, non-transactional writes.
- Fuel sales do not reduce a tank ledger.
- Duplicate readings for the same nozzle, shift and business date are possible.
- Dashboard “revenue” is the total of payments entered, not litres sold multiplied by a historical fuel rate.
- Client clocks and UTC `toISOString()` determine business dates and audit timestamps.
- Audit logs are created by clients and can be modified or deleted by an admin.
- Date-range reports can execute one database query per day.

These behaviours can produce wrong stock, revenue and audit results under normal concurrency.

#### 9. Subscription pricing is marketing copy only

The landing page advertises Free, Outlet and Chain tiers, but no plan, entitlement, checkout, invoice, trial, renewal, grace-period or suspension logic exists. Limits must be enforced on the server, not only hidden in the UI.

#### 10. Quality and operations are incomplete

The repository has no automated tests. It also lacks rule tests, billing webhook tests, monitoring, error tracking, backup/restore exercises, rate limiting and a production incident workflow. The attempted production build reached compilation but was interrupted by a Windows lock on `.next/trace`; this is an environment issue to clear before using the build as a baseline.

### How administrator and manager login should work

Do not build separate hardcoded “admin login” and “manager login” credentials.

- Everyone signs in through one `/login` page with their own identity.
- A person who registers a new petrol-pump business becomes that organisation's `organisation_owner`, not a global admin.
- The owner invites additional people and assigns an organisation role and/or outlet-specific role.
- A manager receives an email/SMS invitation, creates their own password, and signs in through the same login page.
- After authentication, the backend loads the person's memberships and effective permissions.
- If the person has access to several organisations or outlets, show an organisation/outlet switcher.
- The same person can be an outlet admin at Pump A, a manager at Pump B and have no access to Pump C.
- The Pumpline `platform_super_admin` role is assigned only from a trusted server and uses a separate protected `/super-admin` area.
- Owners should not choose or know employees' permanent passwords. If temporary credentials are required for a pilot, force a password reset at first sign-in and never display the password again.

### Product gaps found through market research

Indian competitors consistently offer more than basic meter entry. The most important gaps to prioritise are:

#### Forecourt operations

- Formal open-shift, handover and close-shift workflow with approval and locking.
- Reading continuity, duplicate prevention, totalizer rollover and test/calibration handling.
- Historical selling-price and purchase-price records per product and outlet.
- Tank calibration/dip charts, density and temperature records.
- Immutable tank stock movement ledger and automated book-vs-physical variance.
- Cash denomination, UPI/card/fleet-card settlement, bank deposit and short/excess reconciliation.
- Delivery challan, invoice, supplier, tanker/driver and shortage records.

#### Customer and finance workflows

- Credit customers, vehicles/drivers, credit limits, sales slips, receipts, ageing and statements.
- Monthly invoicing and WhatsApp/SMS payment reminders.
- Lubricants and other non-fuel inventory.
- GST-ready reports and exports for Tally/Zoho Books; e-invoice support only after confirming the customer's legal applicability with a CA.
- Pump/outlet P&L, margin, expense approval and consolidated owner reporting.

#### Multi-outlet ownership

- One owner dashboard across all outlets with drill-down.
- Outlet comparisons, variance trends and exception alerts.
- Per-outlet user assignment instead of global roles.
- Owner digest by WhatsApp/email and configurable low-stock/variance/overdue alerts.
- Mobile-first entry, resilient offline queueing and conflict handling.
- Regional language support, beginning with an internationalisation-ready UI.

#### SaaS operations

- Guided onboarding and demo/sample data.
- Trial, checkout, invoices, renewals, failed-payment recovery and self-service billing.
- Support tickets, announcements, feature flags and documented status/incident handling.
- Customer data export, retention and deletion workflow.

### Research basis

Market examples reviewed on 28 June 2026:

- [PumpPilot](https://pumppilot.in/) advertises shift close, dip/credit/expense modules, WhatsApp owner reports, multi-user access, Tally/GST output and multi-site reporting. Its published single-pump monthly price is a useful market reference, not a price Pumpline must copy.
- [FuelSetu](https://fuelsetu.com/) highlights multi-outlet control, Tally/Zoho/POS sync, fleet credit, multiple role-specific experiences, regional languages and offline operation.
- [PumpCount](https://petrolpumpsoftware.com/) lists meter and dip readings, density, credit/customer access, payroll, accounting, GST/e-invoice, SMS/email/WhatsApp and online/offline use.
- [PetroPulse360](https://petropulse360.com/features) lists shift fuel sales, dip/density, lubricants, credit ledgers, expenses, multi-outlet control and variance detection.
- [Razorpay Subscriptions](https://razorpay.com/docs/payments/subscriptions/) supports plan-based billing, trials, multiple tiers, invoices, retries and webhook events. Its [supported payment methods](https://razorpay.com/docs/payments/subscriptions/supported-payment-methods/?preferred-country=IN) include cards, UPI Autopay and eMandate, subject to provider rules and merchant approval.
- [Firebase Admin user management](https://firebase.google.com/docs/auth/admin/manage-users) is the correct trusted-server mechanism for creating, disabling and deleting team identities.
- [Firestore rules conditions](https://firebase.google.com/docs/firestore/security/rules-conditions) explicitly note that rules are not filters; every client query must include constraints that can satisfy its tenant rules.
- [Firebase custom claims](https://firebase.google.com/docs/auth/admin/custom-claims) can enforce high-level platform roles and paid/unpaid attributes, but claims must be assigned from a privileged server environment.
- India's [Digital Personal Data Protection Rules, 2025](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025.pdf) and [DPDP Act, 2023](https://www.meity.gov.in/static/uploads/2024/02/Digital-Personal-Data-Protection-Act-2023.pdf) make privacy notices, reasonable safeguards, breach handling and data-principal workflows product requirements, not optional polish. Obtain Indian legal advice before launch.

---

## Part 2: Copy-ready master implementation prompt

Copy everything from “Prompt begins” to “Prompt ends” into the coding agent used to rebuild this repository.

### Prompt begins

You are the principal product engineer and security-minded SaaS architect for **Pumpline**, an Indian petrol-pump operations platform. Transform the existing repository into a production-ready, subscription-based, multi-tenant application for independent petrol pumps and multi-outlet operators across India.

Work from the existing codebase. Preserve good operational UI and working domain features, but replace unsafe foundations instead of patching around them. Implement in small, reviewable phases and keep the app runnable after each phase.

#### Product outcome

Build a SaaS in which:

1. Any legitimate petrol-pump owner can choose a plan, create an account, verify their identity, create a private organisation and configure the first outlet.
2. One organisation can own one or many outlets.
3. Organisation owners can invite multiple admins, managers, operators and finance users.
4. Permissions can differ per outlet.
5. All customer data is isolated by organisation and outlet at the database-rule, query and server layers.
6. Subscription state and plan entitlements are enforced on the server.
7. A separate Pumpline super-admin console manages plans, subscriptions, organisations, support and platform health.
8. The existing pump-management modules continue to work and evolve into accurate, auditable ledgers.

#### Non-negotiable rules

- Never use hardcoded users, passwords, magic admin emails or “first user in the whole database” logic.
- Never assign a privileged role from browser-submitted profile data.
- Never depend on hidden buttons or client route guards as authorization.
- Never let one tenant query another tenant's users, assets, transactions, reports or billing data.
- Never expose Firebase Admin, Razorpay or other private credentials to browser code.
- Never accept client-submitted subscription status, price, role, organisation ID, outlet ID, audit actor or entitlement as trusted.
- Never create staff accounts with the client Firebase signup API.
- Never silently invent a fallback authorization profile after an error. Fail closed and show a recoverable error.
- Never mutate balances with independent read/modify/write calls. Use transactions, idempotency keys and immutable ledger entries.
- Never allow audit events or closed shifts to be edited or deleted in place.
- Do not claim that a feature is complete until its happy path, permission boundaries, failure states and tests work.

#### Recommended architecture

Keep Firebase Authentication and Firestore if practical, but add a trusted backend.

- Remove the static-only `output: "export"` constraint.
- Run Next.js with a supported server runtime, or place trusted operations in Firebase/Google Cloud Functions. Document the chosen deployment model.
- Add Firebase Admin SDK only to server code.
- Verify Firebase ID tokens or secure session cookies for every privileged server endpoint.
- Use Firestore client access only where security rules can safely enforce the request. Use server actions/routes for invitations, role changes, account deletion, billing, exports requiring elevated access and super-admin actions.
- Add Firebase App Check, rate limiting and abuse protection where suitable.
- Introduce a payment-provider adapter. Implement Razorpay Subscriptions first for India without coupling the domain model to Razorpay-specific field names.
- Receive billing changes only from signature-verified webhooks. Store and reject duplicate webhook event IDs.
- Use server timestamps and an explicit outlet time zone. Store instants in UTC and derive the outlet's business date using its configured time zone (default `Asia/Kolkata`).
- Use Firestore Emulator Suite for rules and integration tests.
- Upgrade Next.js/Firebase and other old dependencies in a dedicated, tested step rather than mixing a framework upgrade into the data migration.

#### Canonical identity and tenancy model

Use clear IDs and canonical membership documents. A suggested Firestore shape is:

```text
users/{uid}
  private profile and preferences only; no self-assigned authority
users/{uid}/accessIndex/{organisationId}
  server-maintained summary for the account switcher

organisations/{organisationId}
  legal/display name, GSTIN optional, ownerUid, status, locale, createdAt
organisations/{organisationId}/members/{uid}
  organisationRole, status, invitedBy, acceptedAt
organisations/{organisationId}/invitations/{invitationId}
  hashed token, target, role, outlet assignments, expiry, status
organisations/{organisationId}/outlets/{outletId}
  outlet code, name, OMC brand, address, state, timeZone, business-day settings
organisations/{organisationId}/outlets/{outletId}/members/{uid}
  outletRole, status

organisations/{organisationId}/outlets/{outletId}/fuelProducts/{id}
organisations/{organisationId}/outlets/{outletId}/fuelPrices/{id}
organisations/{organisationId}/outlets/{outletId}/tanks/{id}
organisations/{organisationId}/outlets/{outletId}/nozzles/{id}
organisations/{organisationId}/outlets/{outletId}/shifts/{id}
organisations/{organisationId}/outlets/{outletId}/meterReadings/{id}
organisations/{organisationId}/outlets/{outletId}/stockMovements/{id}
organisations/{organisationId}/outlets/{outletId}/deliveries/{id}
organisations/{organisationId}/outlets/{outletId}/payments/{id}
organisations/{organisationId}/outlets/{outletId}/expenses/{id}
organisations/{organisationId}/outlets/{outletId}/creditCustomers/{id}
organisations/{organisationId}/outlets/{outletId}/creditTransactions/{id}
organisations/{organisationId}/outlets/{outletId}/auditEvents/{id}

plans/{planId}
subscriptions/{organisationId}
billingInvoices/{invoiceId}
billingWebhookEvents/{providerEventId}
platformAdmins/{uid}
platformAuditEvents/{id}
```

Adjust names if a better schema is demonstrated, but preserve the same security boundaries. Prefer canonical nested tenant paths over trusting an arbitrary `organisationId` field on a global document.

Custom claims should be small and slow-changing. Use a claim such as `platformSuperAdmin: true` only for Pumpline's internal role. Keep organisation and outlet memberships in Firestore so a user can hold different roles at different outlets. All custom claims must be assigned by the Admin SDK.

#### Roles and permissions

Implement permission checks as named capabilities, not scattered role-name comparisons.

1. `platform_super_admin`
   - Internal Pumpline staff only.
   - Manage organisations, subscriptions, plans, support access, feature flags and platform operations.
   - Does not automatically browse customer operational records. Any support access must be reasoned, time-limited, visible to the customer and audited.

2. `organisation_owner`
   - Subscriber/business owner.
   - Full organisation access, all outlets, billing, member management, consolidated reports and data export.
   - At least one active owner must always remain.

3. `organisation_admin`
   - Manage organisation settings, outlets and members except ownership transfer and selected billing actions.

4. `outlet_admin`
   - Full operational configuration and user assignment for explicitly assigned outlets only.

5. `manager`
   - Run and approve daily operations for assigned outlets, close shifts, view reports and correct records through controlled adjustment entries.
   - Cannot manage subscription, organisation ownership or privilege escalation.

6. `operator`
   - Enter assigned shift readings, payments, dips and deliveries as permitted.
   - Cannot see sensitive cross-shift finance, delete records or manage users.

7. `accountant` / `auditor`
   - Read finance, ledger and reports for assigned scope; export where allowed; no operational mutation.

Create one central capability matrix and use it in UI, server handlers and rule tests. Include negative tests for every role.

#### Authentication, signup and invitation flows

Implement one login surface for owners, admins, managers and staff.

Public owner onboarding:

1. Landing/pricing CTA includes the selected `planId`.
2. Register with name, email and mobile; verify email at minimum, with phone OTP as a later/provider-backed option.
3. Accept Terms and Privacy Notice versions explicitly.
4. A trusted, idempotent server transaction creates the user profile, organisation, owner membership, first outlet and trial subscription.
5. Guide the owner through outlet details, fuel products, current prices, tanks, nozzles, opening stock and team invitations.
6. Show progress and allow safe resume after interruption.

Team onboarding:

1. An authorised owner/admin enters the invitee's email or phone, role and outlet scope.
2. The server creates a single-use, expiring invitation. Do not store a plain invitation token.
3. Send a branded invitation link.
4. New users verify identity and set their own password; existing users accept into their existing account.
5. Acceptance is atomic and idempotent. It must reject expired, revoked, mismatched or already-used invitations.
6. Role changes, removals and outlet reassignment revoke/refresh access promptly.
7. Removing a user disables the membership immediately. If the account has no memberships, optionally disable the Auth user according to policy. Revoke refresh tokens for security-sensitive removals.

Also implement forgot password, email verification, session expiry, recent-login checks for sensitive actions and optional MFA for owners/super admins.

If a user has multiple organisations/outlets, show a switcher and persist only a validated preference. Never trust an outlet ID taken from local storage without rechecking membership.

#### Subscription and entitlement system

Plans and prices must be data-driven and editable by super admin. Do not hardcode limits into page components.

Seed example tiers for testing only:

- `trial`: 14 days, one outlet, limited seats, no payment method required.
- `starter`: one outlet and a defined seat limit.
- `growth`: several outlets, more users, consolidated reports and alerts.
- `enterprise`: negotiated limits, integrations, support and custom billing.

The final names, prices, taxes and limits are business decisions. Market research suggests testing a single-outlet paid price near the Indian market rather than promising “free forever,” but keep all amounts configurable.

Model entitlements such as:

```text
maxOutlets
maxMembers
maxManagers
reportHistoryDays
excelExport
pdfExport
whatsappAlerts
accountingExport
apiAccess
offlineSync
supportLevel
```

Model subscription states explicitly:

```text
trialing -> active -> past_due -> grace_period -> suspended
                    -> cancelled_at_period_end -> cancelled
```

Required billing behaviours:

- Server creates provider customers/subscriptions and records provider IDs.
- Verify checkout signatures and webhook signatures.
- Store raw provider payloads securely with retention/redaction policy.
- Process webhook events idempotently and out of order safely.
- Generate or link invoices/receipts and store GST/tax fields as applicable.
- Support monthly and annual billing, plan change, cancellation and renewal.
- Provide self-service billing history and payment-method/update instructions.
- Send trial-ending, renewal, failed-payment and suspension notifications.
- Define a configurable grace period.
- During suspension, owners retain access to billing and data export. Operational access becomes read-only or locked according to policy; never destroy customer data automatically.
- Enforce outlet/seat/feature limits in trusted server operations and show useful upgrade messages in the UI.
- Super-admin overrides must include reason, actor, effective dates and an immutable audit event.

#### Public website changes

Keep and improve the public landing page. Remove misleading claims that are not backed by implemented functionality.

- Navigation: Product, Features, Pricing, Security, Contact, Sign in.
- Primary CTA: `Start 14-day trial`.
- Secondary CTA: `Book a demo`.
- Pricing cards must come from published plan data or a safe public config endpoint.
- Selecting a plan must continue through signup and checkout/onboarding without losing the selection.
- Add clear multi-outlet positioning, role-based access, customer support and privacy/security pages.
- Add Terms, Privacy, Cancellation/Refund and Contact/Grievance information before accepting payments.
- Do not advertise free forever, cloud backup, offline sync, WhatsApp or accounting integrations until those capabilities actually exist.

#### Core pump product requirements

Preserve existing modules, then correct and extend them in this order.

##### 1. Outlet setup

- Organisation and outlet profile, outlet code, OMC brand, state and time zone.
- Fuel products including Petrol, Diesel and premium variants.
- Effective-dated selling and purchase prices.
- Tanks with capacity, safe fill, product, calibration/dip chart and opening balance.
- Dispensing units/nozzles linked to tanks and products.
- Validation that linked assets belong to the same outlet.

##### 2. Shift workflow

- Shift templates and assigned team.
- Open shift with opening totalizers and opening balances.
- Capture closing readings, test litres, rate changes and totalizer rollover.
- Calculate gross litres, net litres, expected sales and expected collections.
- Split tender by cash, UPI, card, fleet card and credit customer.
- Cash denomination and handover.
- Show and explain variance before close.
- Manager approval and immutable close.
- Corrections only through reversal/adjustment entries with reason and approval.
- Unique constraint/idempotency rule for outlet + nozzle + shift + reading type.

##### 3. Stock ledger

- Use immutable stock movements: opening, delivery, sale, transfer, test, evaporation/loss, gain and adjustment.
- Derive current stock from ledger/validated aggregates, not an editable balance alone.
- Delivery and stock update happen atomically.
- Record supplier, invoice/challan, vehicle, driver, quantity, density and receiving variance.
- Dip entry converts height to quantity through the selected calibration chart.
- Compare book stock and physical stock with configurable tolerance and alerting.
- Prevent negative stock unless an authorised adjustment policy explicitly allows it.

##### 4. Payments and reconciliation

- Separate sales value from money collected.
- Reconcile expected shift revenue with cash, UPI, cards, fleet cards and credit.
- Track card/UPI settlement and bank deposit status.
- Record short/excess with staff responsibility and manager approval.
- Support attachments for slips and invoices using tenant-scoped storage rules.

##### 5. Credit customers

- Customer, contact, GST details, vehicles/drivers, credit limit and payment terms.
- Fuel issue slips linked to shift/nozzle/product/vehicle.
- Debit/credit/receipt ledger, ageing buckets, statements and outstanding alerts.
- Invoice/statement export and consented WhatsApp/email reminders.

##### 6. Expenses and accounting

- Configurable categories, attachments and approval thresholds.
- Cash/bank source and shift association.
- Outlet and consolidated P&L using sales, purchase cost and expenses.
- GST-ready summaries and mapping-based Tally/Zoho exports in a later phase.
- Do not claim statutory compliance without tests and review by an Indian CA/tax specialist.

##### 7. Reports and owner intelligence

- Daily sales/shift report, nozzle report, tank ledger, dip variance, delivery report, tender reconciliation, credit ageing, expense and P&L.
- Organisation-wide dashboard with outlet comparison and drill-down.
- Date ranges must use bounded indexed queries or precomputed summaries, not one query per day.
- Scheduled owner digest and configurable exception alerts.
- Exports include organisation, outlet, period, generated-by and generated-at metadata.

##### 8. Later modules behind feature flags

- Lubricant/non-fuel inventory and POS.
- Attendance/payroll.
- OMC/DU automation import or integration.
- Customer self-service portal.
- Regional languages.
- Public API and webhooks.
- Predictive reorder and anomaly detection only after underlying data quality is proven.

#### Super-admin console

Build a separate `/super-admin` route group with server-enforced platform access.

Dashboard:

- Active/trial/past-due/suspended organisations.
- Active outlets and users.
- MRR/ARR, renewals, churn and failed-payment totals.
- Webhook failures, queue health, application errors and recent security events.

Controls:

- Create/version/archive plans and prices; never rewrite historical invoice truth.
- Configure entitlement limits, trials, coupons and feature flags.
- Search organisations and inspect subscription/outlet/member summaries.
- Suspend/reactivate an organisation with reason and effective time.
- Retry/reconcile billing webhooks safely.
- Manage announcements and support tickets.
- Export platform-level business metrics without exposing unrelated tenant operations.
- Start time-limited support access only with explicit reason, customer-visible banner and complete audit trail.
- Require MFA/recent authentication for high-impact actions.

Do not create a publicly discoverable super-admin signup flow. Bootstrap the first platform administrator through a documented one-time server script or protected deployment process.

#### Security, privacy and audit requirements

- Default deny in Firestore and Storage rules.
- Rules must validate organisation membership, outlet membership, allowed fields, immutable ownership fields and role/capability.
- Queries must be scoped to paths/constraints that rules can prove.
- Add rule tests showing Tenant A cannot read/write Tenant B for every collection group.
- Add server authorization checks even when Firestore rules also exist.
- Use input schemas, output shaping and safe error messages.
- Rate-limit login-adjacent, invitation, export and billing operations.
- Protect against IDOR, mass assignment, privilege escalation and replayed webhooks.
- Keep secrets in managed environment secrets; rotate and document them.
- Audit login/security events, role changes, subscription changes, exports, shift close/reopen attempts, deletions and support access.
- Audit events are server-created, append-only and contain actor, action, scope, target, reason, request/correlation ID and server timestamp.
- Provide privacy notice/version tracking, consent records where needed, data access/export, correction and deletion-request workflows.
- Define retention by data type and legal/business need. Confirm final policy with Indian counsel.
- Encrypt in transit and at rest through platform services; minimise personal data and redact sensitive logs.
- Maintain backups, verify restore procedures and document recovery objectives.
- Add security headers, dependency scanning, monitoring, alerting and an incident-response runbook.

#### Offline and mobile behaviour

The existing PWA fallback is not the same as safe offline data entry.

- Design mobile-first forms with large targets and low typing burden.
- If offline entry is enabled, use a durable local outbox, client-generated idempotency key, visible sync status and conflict policy.
- Never claim a shift is closed until the server confirms it.
- Prevent duplicated meter readings/payments after reconnect.
- Make cached tenant data unavailable after sign-out or membership revocation as far as the platform permits.

#### Migration strategy

Do not perform a destructive big-bang migration.

Phase 0 — Baseline and safety:

- Capture current routes, collections and behaviour.
- Add tests around the existing critical calculations.
- Fix the build environment and establish a passing baseline.
- Immediately close the self-admin rule vulnerability and remove fail-open profiles.
- Put public signup behind a safe maintenance/allowlist gate until tenant provisioning is ready if this app is already deployed.

Phase 1 — Trusted backend and identity:

- Add Admin SDK, verified sessions/tokens, server authorization utilities and emulator setup.
- Implement organisations, outlets, memberships, capability matrix and invitations.
- Add one login and account/outlet switcher.
- Add complete tenant-isolation tests.

Phase 2 — Tenant data migration:

- Build an idempotent migration script with dry-run, counts, checksums, backups and rollback documentation.
- Treat all current global data as one explicit legacy organisation/outlet selected by configuration; do not guess silently.
- Copy/transform records into tenant paths and maintain old IDs or a mapping table.
- Validate referential integrity and totals before cutover.
- Remove legacy collection access only after validation.

Phase 3 — Subscription platform:

- Add plans, entitlements, checkout, verified webhooks, billing portal/history and super-admin subscription tools.
- Replace static landing prices with published plan data.
- Test trial, payment success, failure, retry, cancellation, upgrade and suspension.

Phase 4 — Ledger correctness:

- Introduce formal shifts, price history, stock movements, atomic delivery, payment reconciliation and immutable adjustments.
- Reconcile migrated balances and provide exception reports.

Phase 5 — Market-critical modules:

- Credit customers, owner alerts, consolidated multi-outlet reports and accounting exports.
- Add later modules only behind flags and only after metrics confirm demand.

#### Testing and acceptance criteria

At minimum, completion requires:

1. Two independently created organisations cannot access each other's data through UI, Firebase SDK, guessed IDs, collection-group queries, exports or server APIs.
2. The first user of every new organisation becomes only that organisation's owner.
3. A person can hold different roles at two outlets and sees exactly the permitted data/actions at each.
4. An outlet admin cannot grant organisation-owner or platform-super-admin authority.
5. Inviting a user does not sign out or replace the inviter's session.
6. Revoked members lose access and cannot recreate their own membership/profile.
7. No browser request can change plan, price, entitlement, subscription status or invoice truth.
8. Duplicate/replayed payment webhooks have no duplicate effect.
9. Outlet and member limits are enforced under concurrent requests.
10. Past-due/grace/suspended states behave according to policy while billing/export remain available to the owner.
11. A delivery plus its stock movement is atomic and idempotent.
12. Shift close prevents duplicate readings and produces reproducible sales/collection variance.
13. Closed shifts and audit logs cannot be silently edited or deleted.
14. Business dates remain correct around midnight in the outlet's configured time zone.
15. Dashboard sales value comes from litres and effective-dated prices; collections and outstanding credit are reported separately.
16. Date-range reports use indexed/bounded queries and are tested on realistic data volume.
17. Firestore and Storage emulator tests cover allowed and denied cases for every role.
18. Unit tests cover money/litre arithmetic, rounding, price changes, stock movements and subscription state transitions.
19. Integration tests cover onboarding, invitations, billing webhooks and membership removal.
20. End-to-end tests cover owner signup -> outlet setup -> invite manager -> manager shift close -> owner consolidated report.
21. Production build, lint/typecheck, tests and security-rule tests pass in CI.
22. Accessibility, responsive layout, empty/loading/error states and keyboard behaviour are verified.
23. Documentation includes architecture, roles, local setup, environment variables, deployment, migration, backup/restore and incident response.

#### Execution and reporting instructions

Before changing code:

1. Read the repository and produce a short architecture decision record.
2. List existing behaviour that will be preserved, changed or removed.
3. Identify any dirty/unrelated user changes and do not overwrite them.
4. Convert this brief into a phased checklist with one active phase at a time.

During implementation:

- Prefer small reusable services and named permission functions.
- Keep domain calculations pure and covered by tests.
- Use integer paise for money and an explicitly documented precision strategy for litres/density. Never use floating-point currency arithmetic.
- Validate on both client and server, with the server authoritative.
- Add indexes with the queries that need them.
- Include loading, empty, failure and retry states.
- Do not leave fake metrics, placeholder security, silent catches or TODO-only features in production paths.

After each phase, report:

- Files and schema changed.
- Security implications.
- Migration impact.
- Tests run and their exact result.
- Remaining risks and the next safe phase.

When a business choice is genuinely unresolved (final price, grace-period length, tax treatment, retention period or provider contract), implement a configurable safe default, label the assumption and request approval before irreversible rollout.

### Prompt ends

---

## Recommended first decision

Before implementation starts, decide whether the initial release is:

1. A paid single-outlet MVP with a 14-day trial, invitations and strong tenant isolation; or
2. A full multi-outlet launch including consolidated reports and advanced billing.

The safer route is option 1 while designing the schema for multi-outlet from day one. It gets the security and subscription foundation into production sooner without delaying launch for every ERP module.
