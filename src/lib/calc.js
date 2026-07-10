// All totals are derived live from time_entries + rate_history.
// Nothing here is ever cached or written back to the database.

import { pad2 } from "./dates";

export const timeToMin = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// Minutes worked for one entry; null while the shift is still open.
// An end time earlier than the start time is treated as crossing midnight.
export const entryMinutes = (entry) => {
  if (!entry.end_time) return null;
  let diff = timeToMin(entry.end_time) - timeToMin(entry.start_time);
  if (diff < 0) diff += 24 * 60;
  return diff;
};

// The rate_history row that applies to a work_date: the row with the
// latest effective_from that is <= work_date, for EVERY date — past,
// today, or future. Date strings compare correctly with < and > because
// they are YYYY-MM-DD.
//
// is_deleted never participates here: deleting a rate only hides it on
// the Rates page, it changes no earnings anywhere. A new rate takes over
// simply by having a later effective_from. If two rows share an
// effective_from (a deleted rate's date reused), the newest row wins.
export const rateRowFor = (rates, workDate) => {
  let best = null;
  for (const r of rates) {
    if (r.effective_from > workDate) continue;
    if (
      !best ||
      r.effective_from > best.effective_from ||
      (r.effective_from === best.effective_from &&
        (r.created_at ?? "") > (best.created_at ?? ""))
    ) {
      best = r;
    }
  }
  return best;
};

export const rateFor = (rates, workDate) => {
  const best = rateRowFor(rates, workDate);
  return best ? Number(best.rate) : null;
};

export const entryEarnings = (entry, rates) => {
  const min = entryMinutes(entry);
  if (min == null) return null;
  const rate = rateFor(rates, entry.work_date);
  if (rate == null) return null;
  return (min / 60) * rate;
};

// Aggregate a set of entries (a day, a week, a month...) live.
export const totals = (entries, rates) => {
  let minutes = 0;
  let earnings = 0;
  let openCount = 0;
  let missingRate = false;
  for (const e of entries) {
    const min = entryMinutes(e);
    if (min == null) {
      openCount += 1;
      continue;
    }
    minutes += min;
    const rate = rateFor(rates, e.work_date);
    if (rate == null) missingRate = true;
    else earnings += (min / 60) * rate;
  }
  return { minutes, earnings, openCount, missingRate };
};

export const fmtDuration = (minutes) =>
  `${Math.floor(minutes / 60)}h ${pad2(Math.round(minutes % 60))}m`;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});
export const fmtMoney = (n) => usd.format(n);
