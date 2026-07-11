import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtDayLong, todayISO } from "../lib/dates";
import { fmtMoney, rateRowFor } from "../lib/calc";
import { useRates } from "../lib/data";
import { PARTNER_LABEL, useView } from "../lib/view";
import { fadeOutRow, restoreRow, rowEnter } from "../lib/motion";

const inputCls =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-violet";

export default function RatesPage() {
  const { isViewingOther: readOnly } = useView();
  const { rates, refresh } = useRates();
  const [rate, setRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

  const today = todayISO();
  const activeRates = (rates ?? []).filter((r) => !r.is_deleted);
  const deletedRates = (rates ?? []).filter((r) => r.is_deleted);

  // The CURRENT rate (the big number, and what new entries are quoted at)
  // considers only ACTIVE rows — soft-deleted rates are excluded here.
  // Entry pricing is different: rateFor over the full history ignores
  // is_deleted entirely, so past earnings never change (see calc.js).
  const currentRow = rates ? rateRowFor(activeRates, today) : null;
  const currentRate = currentRow ? Number(currentRow.rate) : null;
  // The row actually pricing today's entries, deleted or not — used only
  // to flag a deleted row that is still in force for historical pricing.
  const pricingRow = rates ? rateRowFor(rates, today) : null;

  // A row id that wasn't in the previous fetch slides in from the top of
  // the list; everything already on screen stays put.
  const historyRef = useRef(null);
  const knownIds = useRef(null);
  useEffect(() => {
    if (rates === null) return;
    if (knownIds.current) {
      for (const row of rates) {
        if (!knownIds.current.has(row.id)) {
          rowEnter(historyRef.current?.querySelector(`[data-rate="${row.id}"]`));
        }
      }
    }
    knownIds.current = new Set(rates.map((r) => r.id));
  }, [rates]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await supabase.from("rate_history").insert({
      rate: Number(rate),
      effective_from: effectiveFrom,
    });
    setBusy(false);
    if (err) {
      setError(
        err.code === "23505"
          ? "You already have an active rate effective from that date. Delete it first to replace it."
          : err.message
      );
      return;
    }
    setRate("");
    setEffectiveFrom(todayISO());
    refresh();
  };

  // Soft delete only hides the row from this list. Historical pricing is
  // untouched: every existing entry resolves exactly as before.
  const remove = async (row) => {
    const lastActive = activeRates.length === 1;
    const msg = lastActive
      ? `This is your only active rate — new entries won't have a rate until you add another.\n\nDelete the ${fmtMoney(Number(row.rate))}/h rate effective from ${row.effective_from}?`
      : `Delete the ${fmtMoney(Number(row.rate))}/h rate effective from ${row.effective_from}?\n\nThis only hides it from the list — past earnings never change.`;
    if (!window.confirm(msg)) return;
    // Grey the row out first so the state change is visible, then mutate;
    // the refetch re-renders the list without it.
    const node = historyRef.current?.querySelector(`[data-rate="${row.id}"]`);
    await fadeOutRow(node);
    const { error: err } = await supabase
      .from("rate_history")
      .update({ is_deleted: true })
      .eq("id", row.id);
    if (err) {
      restoreRow(node);
      setError(err.message);
    } else refresh();
  };

  const badge = (text, violet = false) => (
    <span
      className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        violet ? "border-violet/40 text-violet" : "border-line text-ink-muted"
      }`}
    >
      {text}
    </span>
  );

  return (
    <div className="space-y-4">
      <h1 className="pb-1 text-xl font-bold text-ink">
        {readOnly ? `${PARTNER_LABEL}’s rate` : "Hourly rate"}
      </h1>

      {/* current rate */}
      <section className="rounded-xl bg-surface shadow-card">
        <div className="px-4 py-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Current rate
          </h2>
          <p className="mt-1.5 text-[2rem] font-bold leading-none text-brass">
            {currentRate != null ? `${fmtMoney(currentRate)}/h` : "Not set"}
          </p>
          {currentRate == null && rates !== null && (
            <p className="mt-2 text-sm text-ink-muted">
              {pricingRow
                ? "No active rate — a deleted rate still prices existing entries, but new entries won’t have a rate until you add one."
                : readOnly
                  ? "No rate set yet."
                  : "Add your first rate below — entries have no earnings until a rate covers their date."}
            </p>
          )}
        </div>
      </section>

      {/* new rate form */}
      {!readOnly && (
        <form onSubmit={save} className="rounded-xl bg-surface p-4 shadow-card">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Set a new rate
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            Adds a row to your rate history. Every entry is always paid at
            the rate that was effective on its work date — changing your rate
            today never changes past earnings.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink">
              Rate ($ / hour)
              <input
                type="number"
                required
                min="0"
                step="0.01"
                inputMode="decimal"
                placeholder="18.50"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block text-xs font-medium text-ink">
              Effective from
              <input
                type="date"
                required
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className={inputCls}
              />
            </label>
          </div>
          {error && (
            <p className="mt-3 rounded-lg border-[1.5px] border-danger/40 bg-surface px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            data-press
            className="mt-4 rounded-lg bg-violet px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save rate"}
          </button>
        </form>
      )}

      {/* history */}
      <section ref={historyRef} className="rounded-xl bg-surface shadow-card">
        <h2 className="border-b border-line px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Rate history
        </h2>
        {rates === null ? (
          <div className="m-4 h-16 animate-pulse rounded-lg bg-line/40" />
        ) : activeRates.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-ink-muted">
            No active rates.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {activeRates.map((row) => {
              const active = currentRow?.id === row.id;
              return (
                <li
                  key={row.id}
                  data-rate={row.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-brass">
                      {fmtMoney(Number(row.rate))}/h
                      {active && badge("active", true)}
                      {row.effective_from > today && badge("upcoming")}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      from {fmtDayLong(row.effective_from)}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => remove(row)}
                      data-press
                      className="shrink-0 rounded-lg border-[1.5px] border-danger px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/5"
                    >
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Soft-deleted rows are hidden by default. */}
        {deletedRates.length > 0 && (
          <div className="border-t border-line">
            <button
              onClick={() => setShowDeleted((v) => !v)}
              data-press
              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-ink-muted transition hover:text-ink"
            >
              {showDeleted
                ? "Hide deleted rates"
                : `Show deleted rates (${deletedRates.length})`}
            </button>
            {showDeleted && (
              <>
                <p className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">
                  Deleted rates are hidden only — past earnings are unaffected.
                </p>
                <ul className="divide-y divide-line opacity-50">
                  {deletedRates.map((row) => (
                    <li key={row.id} data-rate={row.id} className="px-4 py-3">
                      <p className="text-sm font-bold text-brass">
                        <span className="line-through">
                          {fmtMoney(Number(row.rate))}/h
                        </span>
                        {pricingRow?.id === row.id &&
                          badge("still pricing entries")}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        from {fmtDayLong(row.effective_from)}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
