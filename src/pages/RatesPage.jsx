import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { fmtDayLong, todayISO } from "../lib/dates";
import { fmtMoney, rateRowFor } from "../lib/calc";
import { useRates } from "../lib/data";
import { PARTNER_LABEL, useView } from "../lib/view";
import { fadeOutRow, restoreRow, rowEnter } from "../lib/motion";

const inputCls =
  "mt-1 w-full border border-line bg-sheet px-2.5 py-2 text-sm text-ink outline-none transition focus:border-steel";

export default function RatesPage() {
  const { isViewingOther: readOnly } = useView();
  const { rates, refresh } = useRates();
  const [rate, setRate] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayISO());
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const today = todayISO();
  // Rate resolution ignores is_deleted entirely — the row in force today
  // (and what the big number shows) can be a deleted one. Deletion only
  // controls which section of the list a row appears in.
  const currentRow = rates ? rateRowFor(rates, today) : null;
  const currentRate = currentRow ? Number(currentRow.rate) : null;
  const activeRates = (rates ?? []).filter((r) => !r.is_deleted);
  const deletedRates = (rates ?? []).filter((r) => r.is_deleted);

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

  // Soft delete only hides the row from this list. Pricing is untouched:
  // every entry, past or future, resolves exactly as before until a rate
  // with a later effective_from takes over.
  const remove = async (row) => {
    const lastActive = activeRates.length === 1;
    const msg = lastActive
      ? `This is your only listed rate — the list will look empty, but the rate keeps pricing entries until you add a newer one.\n\nHide the ${fmtMoney(Number(row.rate))}/h rate effective from ${row.effective_from}?`
      : `Delete the ${fmtMoney(Number(row.rate))}/h rate effective from ${row.effective_from}?\n\nThis only hides it from the list — no earnings change, and it keeps applying until a newer rate takes over.`;
    if (!window.confirm(msg)) return;
    // Grey the row out first so the state change is visible, then mutate;
    // the refetch re-renders it in the "deleted" section.
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

  const badge = (text) => (
    <span className="ml-2 border border-steel px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-steel">
      {text}
    </span>
  );

  return (
    <div className="space-y-4">
      <h1 className="border-b-2 border-ink pb-2 font-display text-xl font-bold uppercase tracking-wider text-ink">
        {readOnly ? `${PARTNER_LABEL}’s rate` : "Hourly rate"}
      </h1>

      {/* current rate */}
      <section className="border border-line bg-sheet">
        <div className="ticks border-b border-line" />
        <div className="px-4 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-steel">
            Current rate
          </h2>
          <p className="mt-1 font-display text-4xl font-bold text-ink">
            {currentRate != null ? `${fmtMoney(currentRate)}/h` : "Not set"}
          </p>
          {currentRate == null && rates !== null && !readOnly && (
            <p className="mt-1 text-sm text-steel">
              Add your first rate below — entries have no earnings until a
              rate covers their date.
            </p>
          )}
        </div>
      </section>

      {/* new rate form */}
      {!readOnly && (
        <form onSubmit={save} className="border border-line bg-sheet p-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-steel">
            Set a new rate
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-steel">
            Adds a row to your rate history. Every entry is always paid at
            the rate that was effective on its work date — changing your rate
            today never changes past earnings.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink/80">
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
            <label className="block text-xs font-medium text-ink/80">
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
            <p className="mt-3 border border-rust/40 bg-paper px-3 py-2 text-xs text-rust">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            data-press
            className="mt-4 bg-rust px-4 py-2 text-xs font-bold uppercase tracking-widest text-paper transition hover:bg-rust/90 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save rate"}
          </button>
        </form>
      )}

      {/* history */}
      <section ref={historyRef} className="border border-line bg-sheet">
        <h2 className="border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-steel">
          Rate history
        </h2>
        {rates === null ? (
          <div className="m-4 h-16 animate-pulse bg-line/40" />
        ) : activeRates.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-steel">
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
                    <p className="font-display text-sm font-semibold text-ink">
                      {fmtMoney(Number(row.rate))}/h
                      {active && badge("active")}
                      {row.effective_from > today && badge("upcoming")}
                    </p>
                    <p className="mt-0.5 text-xs text-steel">
                      from {fmtDayLong(row.effective_from)}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => remove(row)}
                      data-press
                      className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-steel transition hover:text-ink"
                    >
                      Delete
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {deletedRates.length > 0 && (
          <>
            <h3 className="border-y border-line px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-steel/60">
              Deleted — hidden only; pricing is unaffected
            </h3>
            <ul className="divide-y divide-line opacity-50">
              {deletedRates.map((row) => (
                <li key={row.id} data-rate={row.id} className="px-4 py-3">
                  <p className="font-display text-sm font-semibold text-ink">
                    <span className="line-through">
                      {fmtMoney(Number(row.rate))}/h
                    </span>
                    {currentRow?.id === row.id && badge("still in force")}
                  </p>
                  <p className="mt-0.5 text-xs text-steel">
                    from {fmtDayLong(row.effective_from)}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
