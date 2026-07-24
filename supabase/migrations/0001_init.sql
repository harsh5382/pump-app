-- ═══════════════════════════════════════════════════════════════════════════
-- Pumpline — initial Supabase schema (replaces Firebase/Firestore)
--
-- Run this against a fresh Supabase project:
--   • Dashboard → SQL Editor → paste this file → Run, OR
--   • supabase db push  (with the Supabase CLI linked to the project)
--
-- Design:
--   • Tenancy tables (organisations, members, outlets, invitations,
--     subscriptions) are SERVICE-ROLE ONLY. RLS is enabled with NO permissive
--     policies, so the anon/authenticated (browser) key cannot touch them.
--     All privileged access goes through server actions using the service-role
--     key + SECURITY DEFINER functions — mirroring the old Firebase Admin SDK,
--     where authorization lives in TypeScript (capabilities.ts).
--   • `profiles` is browser-readable/writable for the OWN row only.
--   • Legacy domain tables (tanks, nozzles, …) use camelCase column names so
--     the existing db.ts / types / dashboard pages need no field remapping.
--     They are authenticated-only for now (parity with the current permissive
--     global collections); Phase 2 tightens them to outlet membership.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ───────────────────────────────────────────────────────────────────────────
-- Identity & tenancy
-- ───────────────────────────────────────────────────────────────────────────

-- One row per auth user. id == auth.users.id.
create table if not exists public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  email                    text not null,
  display_name             text not null default '',
  phone                    text,
  accepted_terms_version   text,
  accepted_privacy_version text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists public.organisations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  gstin      text,
  owner_uid  uuid not null references auth.users (id),
  status     text not null default 'active',   -- active | suspended | closed
  locale     text not null default 'en-IN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organisation_members (
  organisation_id   uuid not null references public.organisations (id) on delete cascade,
  uid               uuid not null references auth.users (id) on delete cascade,
  email             text not null default '',
  display_name      text not null default '',
  organisation_role text not null,   -- organisation_owner | organisation_admin | accountant | auditor | member
  status            text not null default 'active',  -- invited | active | suspended | removed
  invited_by        uuid,
  accepted_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (organisation_id, uid)
);

create table if not exists public.outlets (
  id                       uuid primary key default gen_random_uuid(),
  organisation_id          uuid not null references public.organisations (id) on delete cascade,
  code                     text not null,
  name                     text not null,
  omc_brand                text,
  address                  text,
  state                    text,
  time_zone                text not null default 'Asia/Kolkata',
  business_day_cutover_hour int not null default 0,
  status                   text not null default 'active',  -- active | archived
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (organisation_id, code)
);

create table if not exists public.outlet_members (
  outlet_id       uuid not null references public.outlets (id) on delete cascade,
  organisation_id uuid not null references public.organisations (id) on delete cascade,
  uid             uuid not null references auth.users (id) on delete cascade,
  outlet_role     text not null,   -- outlet_admin | manager | operator | accountant | auditor
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (outlet_id, uid)
);

create table if not exists public.invitations (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.organisations (id) on delete cascade,
  token_hash        text not null,   -- SHA-256 of the single-use token; plain token is never stored
  email             text not null,
  phone             text,
  organisation_role text not null,
  outlet_roles      jsonb not null default '{}'::jsonb,  -- { outletId: outletRole }
  status            text not null default 'pending',     -- pending | accepted | revoked | expired
  invited_by        uuid not null,
  expires_at        timestamptz not null,
  accepted_by_uid   uuid,
  accepted_at       timestamptz,
  created_at        timestamptz not null default now()
);
create index if not exists invitations_token_hash_idx on public.invitations (token_hash);
create index if not exists invitations_org_idx on public.invitations (organisation_id);

create table if not exists public.subscriptions (
  organisation_id         uuid primary key references public.organisations (id) on delete cascade,
  plan_id                 text not null,
  status                  text not null,   -- trialing | active | past_due | grace_period | suspended | cancelled_at_period_end | cancelled
  entitlements            jsonb not null,
  trial_ends_at           timestamptz,
  current_period_end      timestamptz,
  grace_ends_at           timestamptz,
  provider_customer_id    text,
  provider_subscription_id text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ───────────────────────────────────────────────────────────────────────────
-- Legacy domain tables — camelCase columns (parity with db.ts / types).
-- outlet_id is present-but-nullable so Phase 2 can tenant-scope without a
-- schema migration.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public."fuelTypes" (
  id          uuid primary key default gen_random_uuid(),
  "outletId"  uuid references public.outlets (id) on delete cascade,
  name        text not null,
  unit        text not null default 'L',
  "createdAt" text not null
);

create table if not exists public.tanks (
  id                    uuid primary key default gen_random_uuid(),
  "outletId"            uuid references public.outlets (id) on delete cascade,
  name                  text not null,
  "fuelTypeId"          text,
  "capacityLiters"      double precision not null default 0,
  "currentStockLiters"  double precision not null default 0,
  "createdAt"           text not null,
  "updatedAt"           text not null
);

create table if not exists public.nozzles (
  id              uuid primary key default gen_random_uuid(),
  "outletId"      uuid references public.outlets (id) on delete cascade,
  "machineNumber" text not null,
  "fuelTypeId"    text,
  "tankId"        text,
  "createdAt"     text not null,
  "updatedAt"     text not null
);

create table if not exists public."meterReadings" (
  id             uuid primary key default gen_random_uuid(),
  "outletId"     uuid references public.outlets (id) on delete cascade,
  "nozzleId"     text not null,
  date           text not null,
  "openingMeter" double precision not null default 0,
  "closingMeter" double precision not null default 0,
  "fuelSold"     double precision not null default 0,
  "enteredBy"    text,
  "createdAt"    text not null,
  "updatedAt"    text not null
);
create index if not exists "meterReadings_date_idx" on public."meterReadings" (date);
create index if not exists "meterReadings_nozzle_date_idx" on public."meterReadings" ("nozzleId", date);

create table if not exists public."tankerDeliveries" (
  id               uuid primary key default gen_random_uuid(),
  "outletId"       uuid references public.outlets (id) on delete cascade,
  date             text not null,
  "tankerCompany"  text,
  "invoiceNumber"  text,
  "fuelTypeId"     text,
  "tankId"         text not null,
  "quantityLiters" double precision not null default 0,
  "enteredBy"      text,
  "createdAt"      text not null
);
create index if not exists "tankerDeliveries_date_idx" on public."tankerDeliveries" (date);

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  "outletId"    uuid references public.outlets (id) on delete cascade,
  date          text not null,
  "paymentType" text not null,
  amount        double precision not null default 0,
  notes         text,
  "enteredBy"   text,
  "createdAt"   text not null
);
create index if not exists payments_date_idx on public.payments (date);

create table if not exists public."dipEntries" (
  id                 uuid primary key default gen_random_uuid(),
  "outletId"         uuid references public.outlets (id) on delete cascade,
  "tankId"           text not null,
  date               text not null,
  "dipReading"       double precision not null default 0,
  "actualQuantity"   double precision not null default 0,
  "expectedQuantity" double precision not null default 0,
  "lossOrGain"       double precision not null default 0,
  "enteredBy"        text,
  "createdAt"        text not null
);
create index if not exists "dipEntries_date_idx" on public."dipEntries" (date);

create table if not exists public.expenses (
  id            uuid primary key default gen_random_uuid(),
  "outletId"    uuid references public.outlets (id) on delete cascade,
  date          text not null,
  category      text not null,
  amount        double precision not null default 0,
  description   text,
  "enteredBy"   text,
  "createdAt"   text not null
);
create index if not exists expenses_date_idx on public.expenses (date);

create table if not exists public.shifts (
  id                 uuid primary key default gen_random_uuid(),
  "outletId"         uuid references public.outlets (id) on delete cascade,
  "staffName"        text not null,
  date               text not null,
  "shiftStart"       text,
  "shiftEnd"         text,
  "assignedNozzleIds" text[] not null default '{}',
  "cashCollected"    double precision not null default 0,
  "enteredBy"        text,
  "createdAt"        text not null,
  "updatedAt"        text not null
);
create index if not exists shifts_date_idx on public.shifts (date);

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  "outletId"  uuid references public.outlets (id) on delete cascade,
  type        text not null,
  title       text not null,
  message     text not null,
  read        boolean not null default false,
  "userId"    text,
  "createdAt" text not null
);
create index if not exists notifications_created_idx on public.notifications ("createdAt" desc);

create table if not exists public."auditLogs" (
  id          uuid primary key default gen_random_uuid(),
  "outletId"  uuid references public.outlets (id) on delete cascade,
  "userId"    text not null,
  "userEmail" text not null,
  action      text not null,
  resource    text not null,
  details     text,
  "createdAt" text not null
);

-- ───────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row whenever an auth user is created.
-- display_name is read from the sign-up metadata { data: { display_name } }.
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The trigger runs as the table owner regardless of caller; revoke direct RPC
-- execute so it can't be invoked over the REST API by anon/authenticated.
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Row-Level Security
-- ───────────────────────────────────────────────────────────────────────────

-- Tenancy tables: enable RLS, add NO policies → deny all for anon/authenticated.
-- Only the service-role key (used by server actions) can read/write them.
alter table public.organisations        enable row level security;
alter table public.organisation_members enable row level security;
alter table public.outlets              enable row level security;
alter table public.outlet_members       enable row level security;
alter table public.invitations          enable row level security;
alter table public.subscriptions        enable row level security;

-- profiles: the browser may read & update only its OWN row. Inserts happen
-- server-side (service role) on sign-up, but allow self-insert too for safety.
alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

-- Legacy domain tables: authenticated users get full access (parity with the
-- current permissive global collections). PHASE 2: replace `authenticated`
-- with an outlet-membership check on "outletId".
do $$
declare t text;
begin
  foreach t in array array[
    'fuelTypes','tanks','nozzles','meterReadings','tankerDeliveries',
    'payments','dipEntries','expenses','shifts','notifications','auditLogs'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true);',
      t || '_authenticated_all', t
    );
  end loop;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- SECURITY DEFINER functions — atomic tenancy operations.
-- Called by server actions with the service-role key. They take the acting
-- user id explicitly (server already verified the session cookie).
-- ───────────────────────────────────────────────────────────────────────────

-- provision_organisation — turns a registered user into an org owner.
-- Idempotent: if the user already owns/belongs to an org, returns that instead.
create or replace function public.provision_organisation(
  p_user_id        uuid,
  p_email          text,
  p_display_name   text,
  p_org_name       text,
  p_outlet_name    text,
  p_outlet_code    text,
  p_omc_brand      text,
  p_address        text,
  p_state          text,
  p_time_zone      text,
  p_terms_version  text,
  p_privacy_version text,
  p_plan_id        text,
  p_entitlements   jsonb,
  p_trial_ends_at  timestamptz
) returns table (organisation_id uuid, outlet_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id    uuid;
  v_outlet_id uuid;
begin
  -- Idempotency: already a member of some org?
  select om.organisation_id into v_org_id
  from public.organisation_members om
  where om.uid = p_user_id
  limit 1;

  if v_org_id is not null then
    select o.id into v_outlet_id
    from public.outlets o
    where o.organisation_id = v_org_id
    order by o.created_at asc
    limit 1;
    return query select v_org_id, v_outlet_id;
    return;
  end if;

  insert into public.organisations (name, owner_uid, status, locale)
  values (p_org_name, p_user_id, 'active', 'en-IN')
  returning id into v_org_id;

  insert into public.organisation_members
    (organisation_id, uid, email, display_name, organisation_role, status, accepted_at)
  values
    (v_org_id, p_user_id, coalesce(p_email,''), coalesce(p_display_name, p_email, 'Owner'),
     'organisation_owner', 'active', now());

  insert into public.outlets
    (organisation_id, code, name, omc_brand, address, state, time_zone)
  values
    (v_org_id, p_outlet_code, p_outlet_name, p_omc_brand, p_address, p_state,
     coalesce(p_time_zone, 'Asia/Kolkata'))
  returning id into v_outlet_id;

  insert into public.outlet_members
    (outlet_id, organisation_id, uid, outlet_role, status)
  values
    (v_outlet_id, v_org_id, p_user_id, 'outlet_admin', 'active');

  insert into public.subscriptions
    (organisation_id, plan_id, status, entitlements, trial_ends_at)
  values
    (v_org_id, p_plan_id, 'trialing', p_entitlements, p_trial_ends_at);

  -- Stamp accepted terms on the profile (profile row created at sign-up).
  update public.profiles
     set accepted_terms_version   = p_terms_version,
         accepted_privacy_version = p_privacy_version,
         updated_at               = now()
   where id = p_user_id;

  return query select v_org_id, v_outlet_id;
end;
$$;

-- get_my_access — server-verified list of orgs/outlets the user can access,
-- shaped as the app's AccessIndexEntry[]. Returns a jsonb array.
create or replace function public.get_my_access(p_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(entry order by entry->>'organisationName'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'organisationId',   o.id,
      'organisationName', o.name,
      'organisationRole', om.organisation_role,
      'outletRoles', coalesce((
        select jsonb_object_agg(outm.outlet_id, outm.outlet_role)
        from public.outlet_members outm
        where outm.organisation_id = o.id
          and outm.uid = p_user_id
          and outm.status = 'active'
      ), '{}'::jsonb),
      'updatedAt', to_char(om.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ) as entry
    from public.organisation_members om
    join public.organisations o on o.id = om.organisation_id
    where om.uid = p_user_id
      and om.status = 'active'
  ) rows;
$$;

-- accept_invitation — atomically redeems a hashed invitation token.
-- Returns { ok: bool, error?: text, organisationId?: uuid }.
create or replace function public.accept_invitation(
  p_user_id      uuid,
  p_email        text,
  p_display_name text,
  p_org_id       uuid,
  p_token_hash   text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv     public.invitations%rowtype;
  v_outlet  record;
begin
  select * into v_inv
  from public.invitations
  where organisation_id = p_org_id and token_hash = p_token_hash
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'Invitation not found.');
  end if;
  if v_inv.status <> 'pending' then
    return jsonb_build_object('ok', false, 'error', 'This invitation has already been used or revoked.');
  end if;
  if v_inv.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'This invitation has expired.');
  end if;
  if v_inv.email is not null and p_email is not null
     and lower(v_inv.email) <> lower(p_email) then
    return jsonb_build_object('ok', false, 'error', 'This invitation was issued to a different email.');
  end if;

  insert into public.organisation_members
    (organisation_id, uid, email, display_name, organisation_role, status, invited_by, accepted_at)
  values
    (p_org_id, p_user_id, coalesce(p_email,''), coalesce(p_display_name, p_email, 'Member'),
     v_inv.organisation_role, 'active', v_inv.invited_by, now())
  on conflict (organisation_id, uid) do update
    set organisation_role = excluded.organisation_role,
        status            = 'active',
        updated_at        = now();

  for v_outlet in
    select key as outlet_id, value::text as outlet_role
    from jsonb_each_text(v_inv.outlet_roles)
  loop
    insert into public.outlet_members
      (outlet_id, organisation_id, uid, outlet_role, status)
    values
      (v_outlet.outlet_id::uuid, p_org_id, p_user_id, v_outlet.outlet_role, 'active')
    on conflict (outlet_id, uid) do update
      set outlet_role = excluded.outlet_role,
          status      = 'active',
          updated_at  = now();
  end loop;

  update public.invitations
     set status = 'accepted', accepted_by_uid = p_user_id, accepted_at = now()
   where id = v_inv.id;

  return jsonb_build_object('ok', true, 'organisationId', p_org_id);
end;
$$;

-- Lock down function execution: only the service role may call them.
revoke all on function public.provision_organisation(uuid,text,text,text,text,text,text,text,text,text,text,text,text,jsonb,timestamptz) from public, anon, authenticated;
revoke all on function public.get_my_access(uuid) from public, anon, authenticated;
revoke all on function public.accept_invitation(uuid,text,text,uuid,text) from public, anon, authenticated;
