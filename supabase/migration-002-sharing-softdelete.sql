-- =============================================================
-- Migration 002 — shared read-only visibility + soft-delete rates
-- Run this in the Supabase SQL Editor on a database that already
-- has the original schema.sql applied.
--
-- BEFORE RUNNING: replace BUDDY_EMAIL_HERE at the bottom with the
-- owner's (your buddy's) login email.
-- =============================================================

-- ---------- viewers: who may READ whose rows ----------
create table public.viewers (
  owner_id   uuid not null references auth.users (id) on delete cascade,
  viewer_id  uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_id, viewer_id),
  check (owner_id <> viewer_id)
);

alter table public.viewers enable row level security;

-- Both sides of a grant can see that it exists. There are deliberately
-- NO insert/update/delete policies: grants are managed only from the
-- SQL editor / dashboard (service role bypasses RLS).
create policy "read own viewer grants" on public.viewers
  for select using (auth.uid() = viewer_id or auth.uid() = owner_id);

-- ---------- widen SELECT to include granted viewers ----------
-- Write policies are untouched: viewers get read-only access.
drop policy "select own entries" on public.time_entries;
create policy "select own or shared entries" on public.time_entries
  for select using (
    user_id = auth.uid()
    or user_id in (select owner_id from public.viewers
                   where viewer_id = auth.uid())
  );

drop policy "select own rates" on public.rate_history;
create policy "select own or shared rates" on public.rate_history
  for select using (
    user_id = auth.uid()
    or user_id in (select owner_id from public.viewers
                   where viewer_id = auth.uid())
  );

-- ---------- soft-delete for rate_history ----------
alter table public.rate_history
  add column is_deleted boolean not null default false;

-- The old hard UNIQUE (user_id, effective_from) would block re-adding a
-- rate on a date whose old rate was only soft-deleted. Only ACTIVE rates
-- need to be unique per date.
alter table public.rate_history
  drop constraint rate_history_user_id_effective_from_key;

create unique index rate_history_active_user_from_key
  on public.rate_history (user_id, effective_from)
  where not is_deleted;

-- ---------- grant: buddy (owner) -> me (viewer) ----------
-- Replace BUDDY_EMAIL_HERE with the owner's login email.
insert into public.viewers (owner_id, viewer_id)
select o.id, v.id
from auth.users o, auth.users v
where o.email = 'mezan.beno@gmail.com'
  and v.email = 'miha.mihelic20@gmail.com'
on conflict do nothing;

-- Sanity check: should return exactly 1 row.
select owner_id, viewer_id, created_at from public.viewers;
