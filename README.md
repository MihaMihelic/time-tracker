# TimeTrack

Private time-tracking and pay-calculation app for two users.

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend / DB / Auth:** Supabase (Postgres + Supabase Auth, row-level security)
- **Hosting:** Vercel (static SPA — no server of your own to run)

Every total (daily / weekly / monthly hours and earnings) is computed live from
`time_entries` + `rate_history` on each page load and after every edit. Rates
are never stored on entries; each entry always resolves to the rate that was
effective on its `work_date`.

**Shared visibility:** the `viewers` table grants one user *read-only* access
to another user's entries and rates. A viewer gets a "My hours / Partner's
hours" toggle and sees the owner's Dashboard/Calendar/Rates with all editing
controls hidden; RLS blocks writes server-side regardless. Grants are managed
only from the SQL editor — there are no write policies on `viewers`.

**Soft-deleted rates:** deleting a rate sets `is_deleted = true` instead of
removing the row. The flag only controls the Rates page list (deleted rows
are greyed out in their own section) — it never participates in earnings.
Every entry, past or future, resolves purely on the latest
`effective_from <= work_date`; a new rate takes over simply by having a
later effective date.

---

## 1. Set up Supabase (one time)

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates
   all three tables, indexes, the `updated_at` trigger, and RLS policies.
   **Already ran the original schema?** Run
   [`supabase/migration-002-sharing-softdelete.sql`](supabase/migration-002-sharing-softdelete.sql)
   instead (fill in the owner's email where marked) — it adds the `viewers`
   table, the shared-read policies, and the `is_deleted` column.
3. Create the two user accounts: **Authentication → Users → Add user →
   Create new user**. Enter email + password and check **Auto Confirm User**.
   Do this twice, once per person.
4. Disable public signups so nobody else can register:
   **Authentication → Sign In / Up → turn off "Allow new users to sign up"**.
   (The app has no signup UI either — this is just belt-and-braces.)
5. Grab your credentials from **Settings → API**:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` / `public` key → `VITE_SUPABASE_ANON_KEY`

The anon key is safe to ship to the browser — RLS is what protects the data.

## 2. Run locally

```bash
npm install
cp .env.example .env    # then fill in the two values
npm run dev
```

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In [vercel.com](https://vercel.com): **Add New → Project → import the repo**.
   Vercel auto-detects Vite; the defaults are correct
   (build `npm run build`, output `dist`).
3. Under **Environment Variables**, add `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY`.
4. Deploy. Done — the app runs entirely on Vercel + Supabase, independent of
   any local machine.

(Alternative without GitHub: `npm i -g vercel && vercel` from this folder.)

---

## How the numbers work

- **Entry hours** = `end_time − start_time`. An end time earlier than the
  start time is treated as a shift crossing midnight (counted on its
  `work_date`). An entry with no end time shows as **in progress** and
  contributes 0 until it's closed.
- **Rate resolution:** for each entry, the `rate_history` row with the latest
  `effective_from` that is `<= work_date`. Editing an old entry today still
  pays it at the rate that applied back then. Soft-deleted rates count like
  any other row — deletion is cosmetic; only a newer `effective_from`
  changes what an entry is paid.
- **Day total** = sum of all entries on that date (split shifts supported).
- **Week total** = ISO week, Monday–Sunday.
- **Month total** = calendar month, 1st to last day.
- Nothing is cached or denormalized — every view recomputes from the raw rows,
  so any edit is reflected everywhere immediately.

## Tests

- `npm test` — vitest unit suite for the live math (`src/lib/calc.test.js`):
  shift minutes, rate resolution, and the soft-delete rules (a deleted rate
  prices past AND today/future entries identically to before deletion; a new
  rate effective today takes over for new entries on its own).
- `npm run smoke:rls` — live smoke test against the real Supabase project
  (`scripts/smoke-rls.mjs`). Proves the viewer can **read** the owner's rows
  but that every insert/update/delete is rejected by RLS, and that a viewer
  cannot self-grant access. Needs `OWNER_EMAIL`/`OWNER_PASSWORD` and
  `VIEWER_EMAIL`/`VIEWER_PASSWORD` env vars plus the usual `VITE_SUPABASE_*`
  values (read from `.env` if present). Run it after applying migration 002.

## Project layout

```
supabase/schema.sql     — tables, trigger, RLS policies (fresh installs)
supabase/migration-002-sharing-softdelete.sql — upgrade for existing DBs
src/lib/dates.js        — local-date helpers (ISO week, calendar month)
src/lib/calc.js         — live hours/earnings math + rate resolution
src/lib/calc.test.js    — unit tests for the above
src/lib/data.js         — Supabase fetch hooks (refetch after every mutation)
src/lib/view.jsx        — whose data is on screen (self vs shared, read-only)
src/pages/Dashboard.jsx — day / week / month totals, browsable into the past
src/pages/CalendarPage  — punch-card month grid + per-day entries
src/pages/RatesPage.jsx — current rate, history, soft-delete, deleted section
src/pages/Login.jsx     — email + password sign-in (no signup)
scripts/smoke-rls.mjs   — live read-only-sharing smoke test
```
