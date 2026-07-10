import { describe, expect, it } from "vitest";
import { entryEarnings, entryMinutes, rateFor, rateRowFor, totals } from "./calc";

// A fixed reference date used as "today" in the test data. Resolution is
// date-branch-free, so no test depends on the wall clock.
const TODAY = "2026-07-10";

const r = (rate, effective_from, is_deleted = false, created_at) => ({
  rate,
  effective_from,
  is_deleted,
  created_at,
});

describe("entryMinutes (smoke)", () => {
  it("computes a normal shift", () => {
    expect(entryMinutes({ start_time: "08:00", end_time: "16:30" })).toBe(510);
  });
  it("treats end < start as crossing midnight", () => {
    expect(entryMinutes({ start_time: "22:00", end_time: "02:00" })).toBe(240);
  });
  it("returns null while the shift is open", () => {
    expect(entryMinutes({ start_time: "08:00", end_time: null })).toBeNull();
  });
});

describe("rateFor — basic resolution (smoke)", () => {
  const rates = [r(20, "2026-06-01"), r(15, "2026-01-01")];

  it("picks the latest effective_from <= work_date", () => {
    expect(rateFor(rates, "2026-06-15")).toBe(20);
    expect(rateFor(rates, "2026-03-01")).toBe(15);
  });
  it("returns null when no rate covers the date", () => {
    expect(rateFor(rates, "2025-12-31")).toBeNull();
  });
  it("handles rows without an is_deleted column (pre-migration data)", () => {
    expect(rateFor([{ rate: 10, effective_from: "2026-01-01" }], TODAY)).toBe(10);
  });
});

describe("rateFor — is_deleted never participates", () => {
  it("a deleted rate prices past, today, and future dates identically to before deletion", () => {
    const before = [r(22, "2026-05-01", false), r(15, "2026-01-01", false)];
    const after = [r(22, "2026-05-01", true), r(15, "2026-01-01", false)];
    for (const date of ["2026-06-01", TODAY, "2026-12-31"]) {
      expect(rateFor(after, date)).toBe(rateFor(before, date));
      expect(rateFor(after, date)).toBe(22);
    }
  });

  it("a deleted rate that is the only covering rate still applies everywhere", () => {
    const rates = [r(18.5, "2026-01-01", true)];
    expect(rateFor(rates, "2026-02-01")).toBe(18.5); // past
    expect(rateFor(rates, TODAY)).toBe(18.5); // today
    expect(rateFor(rates, "2027-01-01")).toBe(18.5); // future
  });

  it("a new rate effective today takes over for new entries without un-deleting the old one", () => {
    const rates = [r(25, TODAY, false), r(22, "2026-05-01", true)];
    expect(rateFor(rates, TODAY)).toBe(25); // new entries
    expect(rateFor(rates, "2026-06-01")).toBe(22); // history untouched
  });

  it("breaks an effective_from tie by newest created_at, not by deletion status", () => {
    const rates = [
      r(22, "2026-05-01", true, "2026-05-01T08:00:00Z"),
      r(25, "2026-05-01", false, "2026-07-10T09:00:00Z"),
    ];
    expect(rateFor(rates, TODAY)).toBe(25);
    expect(rateFor(rates, "2026-06-01")).toBe(25);
    // and the winning row is retrievable for UI badging
    expect(rateRowFor(rates, TODAY).rate).toBe(25);
  });
});

describe("earnings and totals (smoke)", () => {
  const rates = [r(20, "2026-06-01", true), r(10, "2026-01-01")];

  it("prices a historical entry with the deleted rate that was in force", () => {
    const entry = {
      work_date: "2026-06-15",
      start_time: "08:00",
      end_time: "12:00",
    };
    expect(entryEarnings(entry, rates)).toBe(80); // 4h * $20 (deleted)
  });

  it("prices a today entry with the same deleted rate — deletion changes nothing", () => {
    const entry = { work_date: TODAY, start_time: "08:00", end_time: "12:00" };
    expect(entryEarnings(entry, rates)).toBe(80); // 4h * $20 (deleted)
  });

  it("aggregates minutes/earnings and counts open shifts", () => {
    const entries = [
      { work_date: "2026-06-15", start_time: "08:00", end_time: "12:00" },
      { work_date: TODAY, start_time: "08:00", end_time: "12:00" },
      { work_date: TODAY, start_time: "14:00", end_time: null },
    ];
    const t = totals(entries, rates);
    expect(t.minutes).toBe(480);
    expect(t.earnings).toBe(160); // both closed shifts at $20
    expect(t.openCount).toBe(1);
    expect(t.missingRate).toBe(false);
  });

  it("flags entries no rate covers", () => {
    const entries = [
      { work_date: "2025-01-01", start_time: "08:00", end_time: "09:00" },
    ];
    const t = totals(entries, rates);
    expect(t.missingRate).toBe(true);
    expect(t.earnings).toBe(0);
  });
});
