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
import { settle } from "../lib/motion";

const inputCls =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-violet";

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
  // closed can settle its live tick into a static number (GSAP snap).
  const listRef = useRef(null);
  const prevOpen = useRef(new Set());
  const justClosed = new Set(
    entries
      .filter((e) => e.end_time && prevOpen.current.has(e.id))
      .map((e) => e.id)
  );
  useEffect(() => {
    for (const id of justClosed) {
      listRef.current
        ?.querySelectorAll(`[data-entry="${id}"] .js-resolve`)
        .forEach(settle);
    }
    prevOpen.current = new Set(
      entries.filter((e) => !e.end_time).map((e) => e.id)
    );
  }, [entries]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h2 className="text-base font-bold text-ink">{fmtDayLong(date)}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            {rate != null ? (
              <>
                Rate on this date:{" "}
                <span className="font-bold text-brass">{fmtMoney(rate)}/h</span>
              </>
            ) : (
              "No rate covers this date yet"
            )}
          </p>
        </div>
        {!readOnly && editingId === null && (
          <button
            onClick={openAdd}
            data-press
            className="btn-glow shrink-0 rounded-lg bg-violet px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet/90"
          >
            + Add entry
          </button>
        )}
      </div>

      {/* entry list */}
      <ul ref={listRef} className="divide-y divide-line">
        {entries.length === 0 && editingId === null && (
          <li className="px-4 py-6 text-center text-sm text-ink-muted">
            No entries on this day.
          </li>
        )}
        {entries.map((entry) => {
          const min = entryMinutes(entry);
          const money = entryEarnings(entry, rates);
          return (
            <li
              key={entry.id}
              data-entry={entry.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {fmtTime(entry.start_time)} –{" "}
                  {entry.end_time ? (
                    <span className="js-resolve inline-block">
                      {fmtTime(entry.end_time)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted">
                      <span className="tick-live" />
                      On the clock
                    </span>
                  )}
                </p>
                <p className="js-resolve mt-0.5 text-xs text-ink-muted">
                  {min != null ? fmtDuration(min) : "—"}
                  {money != null && (
                    <span className="ml-2 font-bold text-brass">
                      {fmtMoney(money)}
                    </span>
                  )}
                </p>
              </div>
              {!readOnly && (
                <div className="flex shrink-0 gap-3">
                  <button
                    onClick={() => openEdit(entry)}
                    data-press
                    className="text-xs font-semibold text-ink-muted transition hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(entry)}
                    data-press
                    className="text-xs font-semibold text-danger transition hover:text-danger/80"
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
        <form
          onSubmit={save}
          className="rounded-b-xl border-t border-line bg-paper p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {editingId === "new" ? "New entry" : "Edit entry"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink">
              Start time
              <input
                type="time"
                required
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-medium text-ink">
              End time{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            Leave end time empty for a shift that is still running — close it
            later by editing the entry.
          </p>
          {error && (
            <p className="mt-2 rounded-lg border-[1.5px] border-danger/40 bg-surface px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              data-press
              className="btn-glow rounded-lg bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              data-press
              className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* live day total */}
      {entries.length > 0 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Day total
          </span>
          <span className="text-base font-bold text-ink">
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
