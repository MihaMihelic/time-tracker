import { fmtDuration, fmtMoney } from "../lib/calc";

// One timesheet block (day / week / month). Totals arrive already
// computed live from the freshly fetched entries — never stored anywhere.
// The numbers are the content: big stamped figures, hairline rules.
export default function PeriodCard({
  title,
  sublabel,
  totals,
  isCurrent,
  onPrev,
  onNext,
  onReset,
  loading,
}) {
  return (
    <section className="border border-line bg-sheet">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-steel">
            {title}
          </h2>
          <p className="mt-0.5 text-sm font-medium text-ink/80">
            {sublabel}
            {!isCurrent && (
              <button
                onClick={onReset}
                className="ml-2 text-xs font-medium text-steel underline underline-offset-2 transition hover:text-ink"
              >
                back to current
              </button>
            )}
          </p>
        </div>
        <div className="flex divide-x divide-line border border-line">
          <button
            onClick={onPrev}
            aria-label={`Previous ${title.toLowerCase()}`}
            className="flex h-8 w-8 items-center justify-center text-steel transition hover:bg-paper"
          >
            ‹
          </button>
          <button
            onClick={onNext}
            aria-label={`Next ${title.toLowerCase()}`}
            className="flex h-8 w-8 items-center justify-center text-steel transition hover:bg-paper"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between px-4 py-4">
        {loading ? (
          <div className="h-10 w-36 animate-pulse bg-line/40" />
        ) : (
          <>
            <div>
              <p className="font-display text-4xl font-bold text-ink">
                {fmtDuration(totals.minutes)}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-steel">
                Hours worked
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-semibold text-brass">
                {fmtMoney(totals.earnings)}
              </p>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-steel">
                Earned
              </p>
            </div>
          </>
        )}
      </div>

      {!loading && totals.openCount > 0 && (
        <p className="flex items-center gap-2 border-t border-line px-4 py-2 text-xs font-semibold uppercase tracking-wider text-rust">
          <span className="tick-live" />
          {totals.openCount} shift{totals.openCount > 1 ? "s" : ""} on the
          clock — not counted yet
        </p>
      )}
      {!loading && totals.missingRate && (
        <p className="border-t border-line px-4 py-2 text-xs text-steel">
          Some entries have no rate covering their date — add a rate with an
          earlier “effective from” on the Rates page.
        </p>
      )}
    </section>
  );
}
