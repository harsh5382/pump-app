-- ───────────────────────────────────────────────────────────────────────────
-- Pumpline — 0003_billing.sql
--
-- Phase 3.2: Razorpay subscription billing.
--
-- Everything here is SERVICE-ROLE ONLY (RLS on, no policies). Billing truth
-- must never be writable — or forgeable — from the browser. The owner reads
-- their own billing through a capability-checked server action, not via RLS.
--
-- Run in the Supabase SQL editor AFTER 0002_tenant_scope.sql.
-- Idempotent: safe to re-run.
-- ───────────────────────────────────────────────────────────────────────────

-- ── subscriptions: provider bookkeeping ─────────────────────────────────────
-- provider           — which adapter owns this row (razorpay today).
-- last_event_at      — provider timestamp of the newest event already applied.
--                      Older events arriving later are ignored, which is how
--                      out-of-order webhook delivery stays safe.
-- pending_plan_id    — plan the owner is checking out but has not paid for.
--                      Entitlements are NOT granted from this column.
alter table public.subscriptions
  add column if not exists provider        text,
  add column if not exists last_event_at   timestamptz,
  add column if not exists pending_plan_id text,
  add column if not exists cancelled_at    timestamptz;

create index if not exists subscriptions_provider_sub_idx
  on public.subscriptions (provider_subscription_id);

-- ── billing_provider_plans ──────────────────────────────────────────────────
-- Maps a Pumpline plan (plans.ts) to the provider's plan object. Razorpay plans
-- are immutable, so price is part of the key: repricing mints a new provider
-- plan instead of silently charging the old amount.
create table if not exists public.billing_provider_plans (
  provider          text        not null default 'razorpay',
  plan_id           text        not null,
  billing_period    text        not null,           -- monthly | annual
  price_paise       bigint      not null,
  provider_plan_id  text        not null,
  created_at        timestamptz not null default now(),
  primary key (provider, plan_id, billing_period, price_paise)
);

-- ── billing_webhook_events ──────────────────────────────────────────────────
-- Idempotency guard + raw payload archive. The primary key IS the replay
-- defence: a duplicate delivery collides on insert and is dropped before any
-- subscription write happens.
create table if not exists public.billing_webhook_events (
  provider_event_id text        primary key,
  provider          text        not null default 'razorpay',
  event_type        text        not null,
  organisation_id   uuid        references public.organisations (id) on delete set null,
  status            text        not null default 'received', -- received|processed|ignored|failed
  payload           jsonb       not null,
  error             text,
  event_at          timestamptz,
  received_at       timestamptz not null default now(),
  processed_at      timestamptz
);
create index if not exists billing_webhook_events_org_idx
  on public.billing_webhook_events (organisation_id, received_at desc);
create index if not exists billing_webhook_events_status_idx
  on public.billing_webhook_events (status) where status in ('failed', 'received');

-- ── billing_invoices ────────────────────────────────────────────────────────
-- Self-service billing history. One row per charge attempt the provider tells
-- us about; amounts are integer paise, never floats.
create table if not exists public.billing_invoices (
  id                       uuid        primary key default gen_random_uuid(),
  organisation_id          uuid        not null references public.organisations (id) on delete cascade,
  provider                 text        not null default 'razorpay',
  provider_invoice_id      text,
  provider_payment_id      text,
  provider_subscription_id text,
  plan_id                  text,
  description              text,
  amount_paise             bigint      not null default 0,
  currency                 text        not null default 'INR',
  status                   text        not null,            -- paid | failed | issued | refunded
  invoice_url              text,
  issued_at                timestamptz,
  paid_at                  timestamptz,
  created_at               timestamptz not null default now()
);
create index if not exists billing_invoices_org_idx
  on public.billing_invoices (organisation_id, created_at desc);

-- Partial unique indexes: a provider id identifies a charge exactly once, but
-- both columns are nullable (a failed payment has no invoice id), and NULLs
-- must not collide with each other.
create unique index if not exists billing_invoices_provider_invoice_uidx
  on public.billing_invoices (provider, provider_invoice_id)
  where provider_invoice_id is not null;
create unique index if not exists billing_invoices_provider_payment_uidx
  on public.billing_invoices (provider, provider_payment_id)
  where provider_payment_id is not null;

-- ── RLS: deny all to anon/authenticated (service role bypasses) ─────────────
alter table public.billing_provider_plans enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.billing_invoices       enable row level security;
