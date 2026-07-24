-- ═══════════════════════════════════════════════════════════════════════════
-- Phase 2 — tenant-scope the legacy domain tables by outlet.
--
--   • outletId becomes NOT NULL (every row belongs to exactly one outlet).
--   • RLS on domain tables is tightened from "any authenticated user" to
--     "an ACTIVE member of that outlet" (defence-in-depth; the app also scopes
--     every query by outletId). Closes the 0024 permissive-policy advisor WARNs.
--   • is_outlet_member() is SECURITY DEFINER so the policy can read
--     outlet_members (which is otherwise service-role-only) without recursion.
--
-- Prereq: run AFTER existing domain rows are backfilled/emptied (they were
-- wiped for the Phase-2 cutover), so SET NOT NULL succeeds.
-- ═══════════════════════════════════════════════════════════════════════════

-- Membership predicate used by every domain-table policy.
create or replace function public.is_outlet_member(p_outlet_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.outlet_members om
    where om.outlet_id = p_outlet_id
      and om.uid = auth.uid()
      and om.status = 'active'
  );
$$;
revoke all on function public.is_outlet_member(uuid) from public, anon;
-- authenticated must be able to call it (RLS policies evaluate it as the caller).
grant execute on function public.is_outlet_member(uuid) to authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'fuelTypes','tanks','nozzles','meterReadings','tankerDeliveries',
    'payments','dipEntries','expenses','shifts','notifications','auditLogs'
  ] loop
    -- 1. outletId is now mandatory.
    execute format('alter table public.%I alter column "outletId" set not null;', t);

    -- 2. Index the scoping column (every read filters by it).
    execute format(
      'create index if not exists %I on public.%I ("outletId");',
      t || '_outletId_idx', t
    );

    -- 3. Replace the permissive USING(true) policy with an outlet-membership one.
    execute format('drop policy if exists %I on public.%I;', t || '_authenticated_all', t);
    execute format('drop policy if exists %I on public.%I;', t || '_outlet_rw', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using (public.is_outlet_member("outletId")) '
      || 'with check (public.is_outlet_member("outletId"));',
      t || '_outlet_rw', t
    );
  end loop;
end $$;
