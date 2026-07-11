import { useEffect, useRef } from "react";
import { fmtDuration, fmtMoney } from "../lib/calc";
import { countUp } from "../lib/motion";

// One dashboard block (day / week / month). Totals arrive already
// computed live from the freshly fetched entries — never stored anywhere.
// On the dashboard's first load (countUpDelay != null) the figures tick
// up from zero like a mechanical counter; after that they update
// instantly — browsing periods stays quiet.
export default function PeriodCard({
  title,
  sublabel,
  totals,
  isCurrent,
  onPrev,
  onNext,
  onReset,
  loading,
  countUpDelay = null,
}) {
  const minutesRef = useRef(null);
  const moneyRef = useRef(null);
  const played = useRef(false);

  useEffect(() => {
    if (loading || countUpDelay == null || played.current) return;
    played.current = true;
    const tween = countUp({
      minutes: totals.minutes,
      earnings: totals.earnings,
      delay: countUpDelay,
      render: (m, e) => {
        if (minutesRef.current) minutesRef.current.textContent = fmtDuration(m);
        if (moneyRef.current) moneyRef.current.textContent = fmtMoney(e);
      },
    });
    return () => tween?.kill();
  }, [loading, countUpDelay, totals]);

  return (
    <section className="rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {title}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-ink">
            {sublabel}
            {!isCurrent && (
              <button
                onClick={onReset}
                className="ml-2 text-xs font-medium text-ink-muted underline underline-offset-2 transition hover:text-ink"
              >
                back to current
              </button>
            )}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onPrev}
            data-press
            aria-label={`Previous ${title.toLowerCase()}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            ‹
          </button>
          <button
            onClick={onNext}
            data-press
            aria-label={`Next ${title.toLowerCase()}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between px-4 py-4">
        {loading ? (
          <div className="h-10 w-36 animate-pulse rounded-lg bg-line/40" />
        ) : (
          <>
            <div>
              <p ref={minutesRef} className="text-3xl font-bold text-ink">
                {fmtDuration(totals.minutes)}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Hours worked
              </p>
            </div>
            <div className="text-right">
              <p ref={moneyRef} className="text-[2rem] font-bold leading-none text-brass">
                {fmtMoney(totals.earnings)}
              </p>
              <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Earned
              </p>
            </div>
          </>
        )}
      </div>

      {!loading && totals.openCount > 0 && (
        <p className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-xs font-medium text-ink-muted">
          <span className="tick-live" />
          On the clock — {totals.openCount} shift
          {totals.openCount > 1 ? "s" : ""} not counted yet
        </p>
      )}
      {!loading && totals.missingRate && (
        <p className="border-t border-line px-4 py-2.5 text-xs text-ink-muted">
          Some entries have no rate covering their date — add a rate with an
          earlier “effective from” on the Rates page.
        </p>
      )}
    </section>
  );
}
