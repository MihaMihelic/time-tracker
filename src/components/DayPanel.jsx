import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtDayLong, fmtTime } from "../lib/dates";
import {
  entryEarnings,
  entryMinutes,
  fmtDuration,
  fmtMoney,
  rateFor,
  totals,
} from "../lib/calc";
import { useView } from "../lib/view";

const inputCls =
  "mt-1 w-full border border-line bg-sheet px-2.5 py-2 text-sm text-ink outline-none transition focus:border-steel";

// Entries for one selected date: list, add, edit, delete.
// After every mutation `onChange()` refetches, so all totals everywhere
// are recomputed from fresh rows — no cached values.
// In read-only (viewer) mode all mutation controls are hidden; RLS blocks
// writes server-side regardless.
export default function DayPanel({ date, entries, rates, onChange }) {
  const { isViewingOther: readOnly } = useView();
  const [editingId, setEditingId] = useState(null); // null=closed, "new"=adding
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Track which entries were on the clock last render so a shift that just
  // closed can resolve its live tick into a static number (the app's one
  // piece of motion).
  const prevOpen = useRef(new Set());
  const justClosed = new Set(
    entries
      .filter((e) => e.end_time && prevOpen.current.has(e.id))
      .map((e) => e.id)
  );
  useEffect(() => {
    prevOpen.current = new Set(
      entries.filter((e) => !e.end_time).map((e) => e.id)
    );
  }, [entries]);

  // Close the form when switching days.
  useEffect(() => {
    setEditingId(null);
    setError(null);
  }, [date]);

  const openAdd = () => {
    setEditingId("new");
    setStart("");
    setEnd("");
    setError(null);
  };

  const openEdit = (entry) => {
    setEditingId(entry.id);
    setStart(fmtTime(entry.start_time));
    setEnd(fmtTime(entry.end_time));
    setError(null);
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = {
      work_date: date,
      start_time: start,
      end_time: end || null, // empty = shift still in progress
    };
    const q =
      editingId === "new"
        ? supabase.from("time_entries").insert(row)
        : supabase.from("time_entries").update(row).eq("id", editingId);
    const { error: err } = await q;
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEditingId(null);
    onChange();
  };

  const remove = async (entry) => {
    if (!window.confirm("Delete this entry?")) return;
    const { error: err } = await supabase
      .from("time_entries")
      .delete()
      .eq("id", entry.id);
    if (err) setError(err.message);
    else onChange();
  };

  const dayTotals = totals(entries, rates);
  const rate = rateFor(rates, date);

  return (
    <div className="border border-line bg-sheet">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="font-display text-base font-bold text-ink">
            {fmtDayLong(date)}
          </h2>
          <p className="mt-0.5 text-xs text-steel">
            {rate != null
              ? `Rate on this date: ${fmtMoney(rate)}/h`
              : "No rate covers this date yet"}
          </p>
        </div>
        {!readOnly && editingId === null && (
          <button
            onClick={openAdd}
            className="shrink-0 bg-rust px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-paper transition hover:bg-rust/90"
          >
            + Add entry
          </button>
        )}
      </div>

      {/* entry list */}
      <ul className="divide-y divide-line">
        {entries.length === 0 && editingId === null && (
          <li className="px-4 py-6 text-center text-sm text-steel">
            No entries on this day.
          </li>
        )}
        {entries.map((entry) => {
          const min = entryMinutes(entry);
          const money = entryEarnings(entry, rates);
          const resolved = justClosed.has(entry.id);
          return (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="font-display text-sm font-semibold text-ink">
                  {fmtTime(entry.start_time)} –{" "}
                  {entry.end_time ? (
                    <span className={resolved ? "shift-resolve inline-block" : ""}>
                      {fmtTime(entry.end_time)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-rust">
                      <span className="tick-live" />
                      On the clock
                    </span>
                  )}
                </p>
                <p
                  className={`mt-0.5 text-xs text-steel ${
                    resolved ? "shift-resolve" : ""
                  }`}
                >
                  {min != null ? fmtDuration(min) : "—"}
                  {money != null && (
                    <span className="ml-2 font-semibold text-brass">
                      {fmtMoney(money)}
                    </span>
                  )}
                </p>
              </div>
              {!readOnly && (
                <div className="flex shrink-0 gap-3">
                  <button
                    onClick={() => openEdit(entry)}
                    className="text-[11px] font-semibold uppercase tracking-widest text-steel transition hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(entry)}
                    className="text-[11px] font-semibold uppercase tracking-widest text-steel transition hover:text-ink"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* add / edit form */}
      {!readOnly && editingId !== null && (
        <form onSubmit={save} className="border-t border-line bg-paper p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-steel">
            {editingId === "new" ? "New entry" : "Edit entry"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink/80">
              Start time
              <input
                type="time"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-medium text-ink/80">
              End time <span className="font-normal text-steel">(optional)</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-steel">
            Leave end time empty for a shift that is still running — close it
            later by editing the entry.
          </p>
          {error && (
            <p className="mt-2 border border-rust/40 bg-sheet px-3 py-2 text-xs text-rust">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="bg-rust px-4 py-2 text-xs font-bold uppercase tracking-widest text-paper transition hover:bg-rust/90 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="px-4 py-2 text-xs font-semibold uppercase tracking-widest text-steel transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* live day total — heavy rule above, like the summed column on paper */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between border-t-2 border-ink px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-steel">
            Day total
          </span>
          <span className="font-display text-base font-bold text-ink">
            {fmtDuration(dayTotals.minutes)}
            <span className="ml-3 text-brass">
              {fmtMoney(dayTotals.earnings)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
