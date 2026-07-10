-- =============================================================
-- TimeTrack schema — run this once in the Supabase SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste -> Run)
--
-- Already ran an older schema.sql? Don't run this again — run
-- migration-002-sharing-softdelete.sql instead.
-- =============================================================

-- ---------- time_entries ----------
create table public.time_entries (
  id          uuid primary key default gen_random_uuid(),
  -- defaults to the signed-in user, so the client never has to send it
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_date   date not null,
  start_time  time not null,
  end_time    time,                    -- null = shift still in progress
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index time_entries_user_date_idx
  on public.time_entries (user_id, work_date);

-- ---------- rate_history ----------
create table public.rate_history (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rate           numeric(10, 2) not null check (rate >= 0),
  effective_from date not null,
  -- soft delete: only hides the row on the Rates page. Rate resolution
  -- ignores this flag entirely, so no earnings ever change from a delete.
  is_deleted     boolean not null default false,
  created_at     timestamptz not null default now()
);

create index rate_history_user_from_idx
  on public.rate_history (user_id, effective_from desc);

-- Two ACTIVE rates effective from the same day would be ambiguous;
-- soft-deleted rows don't count against this.
create unique index rate_history_active_user_from_key
  on public.rate_history (user_id, effective_from)
  where not is_deleted;

-- ---------- viewers: who may READ whose rows ----------
create table public.viewers (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  viewer_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);

-- ---------- keep updated_at fresh on every edit ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger time_entries_set_updated_at
  before update on public.time_entries
  for each row execute function public.set_updated_at();

-- ---------- Row Level Security ----------
-- Each user can modify only their own rows. SELECT additionally allows
-- users granted read-only access through the viewers table.
alter table public.time_entries enable row level security;
alter table public.rate_history enable row level security;
alter table public.viewers      enable row level security;

create policy "select own or shared entries" on public.time_entries
  for select using (
    user_id = auth.uid()
    or user_id in (select owner_id from public.viewers
                   where viewer_id = auth.uid())
  );
create policy "insert own entries" on public.time_entries
  for insert with check (auth.uid() = user_id);
create policy "update own entries" on public.time_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own entries" on public.time_entries
  for delete using (auth.uid() = user_id);

create policy "select own or shared rates" on public.rate_history
  for select using (
    user_id = auth.uid()
    or user_id in (select owner_id from public.viewers
                   where viewer_id = auth.uid())
  );
create policy "insert own rates" on public.rate_history
  for insert with check (auth.uid() = user_id);
create policy "update own rates" on public.rate_history
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own rates" on public.rate_history
  for delete using (auth.uid() = user_id);

-- Both sides of a grant can see that it exists. There are deliberately
-- NO insert/update/delete policies on viewers: grants are managed only
-- from the SQL editor / dashboard.
create policy "read own viewer grants" on public.viewers
  for select using (auth.uid() = viewer_id or auth.uid() = owner_id);

-- ---------- grant read-only visibility ----------
-- Run after both accounts exist. Replace the two emails:
-- insert into public.viewers (owner_id, viewer_id)
-- select o.id, v.id
-- from auth.users o, auth.users v
-- where o.email = 'owner@example.com'    -- whose hours are shared
--   and v.email = 'viewer@example.com';  -- who may read them
