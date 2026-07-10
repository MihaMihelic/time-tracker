// Live RLS smoke test — verifies shared visibility is READ-ONLY.
// Runs against the real Supabase project with both users' credentials,
// so it must be run AFTER migration-002 (viewers table + policies).
//
//   OWNER  = the account whose hours are shared (your buddy)
//   VIEWER = the account granted read access (you)
//
// Usage (PowerShell):
//   $env:OWNER_EMAIL="buddy@example.com"; $env:OWNER_PASSWORD="..."
//   $env:VIEWER_EMAIL="miha.mihelic20@gmail.com"; $env:VIEWER_PASSWORD="..."
//   npm run smoke:rls
//
// Supabase URL/key are read from the environment or from .env.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// minimal .env loader (no dotenv dependency)
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  /* no .env — rely on real env vars */
}

const URL_ = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_ANON_KEY;
const need = ["OWNER_EMAIL", "OWNER_PASSWORD", "VIEWER_EMAIL", "VIEWER_PASSWORD"];
const missing = need.filter((k) => !process.env[k]);
if (!URL_ || !KEY || missing.length) {
  console.error(
    `Missing config: ${[!URL_ && "VITE_SUPABASE_URL", !KEY && "VITE_SUPABASE_ANON_KEY", ...missing]
      .filter(Boolean)
      .join(", ")}`
  );
  process.exit(2);
}

// Marker data far in the past so it never collides with real rows.
const MARK_DATE = "1990-01-01";

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

const signIn = async (label, email, password) => {
  const client = createClient(URL_, KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    console.error(`Cannot sign in ${label} (${email}): ${error.message}`);
    process.exit(2);
  }
  return { client, id: data.user.id };
};

const owner = await signIn("OWNER", process.env.OWNER_EMAIL, process.env.OWNER_PASSWORD);
const viewer = await signIn("VIEWER", process.env.VIEWER_EMAIL, process.env.VIEWER_PASSWORD);

// ---- setup: owner plants marker rows -------------------------------------
const { data: entry, error: e1 } = await owner.client
  .from("time_entries")
  .insert({ work_date: MARK_DATE, start_time: "08:00", end_time: "16:00" })
  .select()
  .single();
const { data: rateRow, error: e2 } = await owner.client
  .from("rate_history")
  .insert({ rate: 1.23, effective_from: MARK_DATE })
  .select()
  .single();
if (e1 || e2) {
  console.error(`Setup failed: ${e1?.message ?? e2?.message}`);
  process.exit(2);
}

try {
  // ---- viewer grant is visible --------------------------------------------
  const { data: grants } = await viewer.client
    .from("viewers")
    .select("*")
    .eq("viewer_id", viewer.id)
    .eq("owner_id", owner.id);
  check("viewer sees their grant in viewers", (grants ?? []).length === 1);

  // ---- viewer CAN read owner's rows ---------------------------------------
  const { data: ve } = await viewer.client
    .from("time_entries")
    .select("*")
    .eq("user_id", owner.id)
    .eq("work_date", MARK_DATE);
  check("viewer can read owner's time_entries", (ve ?? []).length === 1);

  const { data: vr } = await viewer.client
    .from("rate_history")
    .select("*")
    .eq("user_id", owner.id)
    .eq("effective_from", MARK_DATE);
  check("viewer can read owner's rate_history", (vr ?? []).length === 1);

  // ---- owner does NOT see the viewer's data leak in (sanity) ---------------
  const { data: oe } = await owner.client
    .from("time_entries")
    .select("*")
    .eq("user_id", viewer.id);
  check("owner has no reverse access to viewer's entries", (oe ?? []).length === 0);

  // ---- viewer can NOT write owner's rows ----------------------------------
  const { error: insErr } = await viewer.client
    .from("time_entries")
    .insert({ user_id: owner.id, work_date: MARK_DATE, start_time: "09:00" });
  check("viewer INSERT into owner's time_entries is rejected", insErr != null);

  const { data: updData } = await viewer.client
    .from("time_entries")
    .update({ end_time: "23:59" })
    .eq("id", entry.id)
    .select();
  check("viewer UPDATE of owner's entry affects 0 rows", (updData ?? []).length === 0);

  const { data: delData } = await viewer.client
    .from("time_entries")
    .delete()
    .eq("id", entry.id)
    .select();
  check("viewer DELETE of owner's entry affects 0 rows", (delData ?? []).length === 0);

  const { data: rateUpd } = await viewer.client
    .from("rate_history")
    .update({ is_deleted: true })
    .eq("id", rateRow.id)
    .select();
  check("viewer cannot soft-delete owner's rate", (rateUpd ?? []).length === 0);

  const { error: rateInsErr } = await viewer.client
    .from("rate_history")
    .insert({ user_id: owner.id, rate: 99, effective_from: "1990-01-02" });
  check("viewer INSERT into owner's rate_history is rejected", rateInsErr != null);

  // ---- viewer can NOT write the viewers table itself ----------------------
  const { error: grantErr } = await viewer.client
    .from("viewers")
    .insert({ owner_id: viewer.id, viewer_id: owner.id });
  check("viewer cannot self-grant in viewers table", grantErr != null);

  // ---- owner's row survived all of that ------------------------------------
  const { data: still } = await owner.client
    .from("time_entries")
    .select("end_time")
    .eq("id", entry.id)
    .single();
  check("owner's entry is unchanged after viewer's write attempts", still?.end_time === "16:00:00");
} finally {
  // ---- cleanup (owner removes markers; hard delete is fine for test rows) --
  await owner.client.from("time_entries").delete().eq("id", entry.id);
  await owner.client.from("rate_history").delete().eq("id", rateRow.id);
}

console.log(failures === 0 ? "\nAll RLS smoke checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
