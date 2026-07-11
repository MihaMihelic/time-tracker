import { useEffect, useRef } from "react";
import {
  addDays,
  addMonths,
  fmtMonth,
  monthEnd,
  monthStart,
  todayISO,
  weekStart,
} from "../lib/dates";
import { entryMinutes } from "../lib/calc";
import { selectFlash } from "../lib/motion";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Month grid, Monday-first (matches the ISO week used for totals).
// White card on paper; the selected day is the only violet element,
// and days with a shift still running carry the pulsing violet dot.
export default function MonthCalendar({
  month, // "YYYY-MM-01"
  selected, // "YYYY-MM-DD"
  entries, // entries covering the whole visible grid
  onSelect,
  onMonthChange,
}) {
  const today = todayISO();
  const gridStart = weekStart(monthStart(month));
  const gridEndWeek = weekStart(monthEnd(month));

  // Quick highlight on the newly selected cell — just enough to confirm
  // the tap registered. Skipped on first paint.
  const gridRef = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    selectFlash(gridRef.current?.querySelector(`[data-date="${selected}"]`));
  }, [selected]);

  // Build all visible days: from the Monday before the 1st through the
  // Sunday after the last day.
  const days = [];
  for (let d = gridStart; d <= addDays(gridEndWeek, 6); d = addDays(d, 1)) {
    days.push(d);
  }

  const byDate = new Map();
  for (const e of entries ?? []) {
    if (!byDate.has(e.work_date)) byDate.set(e.work_date, []);
    byDate.get(e.work_date).push(e);
  }

  const dayInfo = (iso) => {
    const list = byDate.get(iso);
    if (!list) return null;
    let min = 0;
    let open = false;
    for (const e of list) {
      const m = entryMinutes(e);
      if (m == null) open = true;
      else min += m;
    }
    const h = min / 60;
    return {
      open,
      label: min > 0 ? `${h % 1 === 0 ? h : h.toFixed(1)}h` : null,
    };
  };

  return (
    <div className="rounded-xl border border-line bg-surface shadow-card">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-base font-bold text-ink">{fmtMonth(month)}</h2>
        <div className="flex gap-1.5">
          <button
            onClick={() => onMonthChange(addMonths(month, -1))}
            data-press
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            ‹
          </button>
          <button
            onClick={() => {
              onMonthChange(monthStart(today));
              onSelect(today);
            }}
            data-press
            className="rounded-lg border border-line px-2.5 text-xs font-semibold text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            Today
          </button>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            data-press
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-muted transition hover:bg-paper hover:text-ink"
          >
            ›
          </button>
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="grid grid-cols-7">
          {DOW.map((d) => (
            <div
              key={d}
              className="border-b border-line pb-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-ink-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div ref={gridRef} className="mt-1.5 grid grid-cols-7 gap-1">
          {days.map((iso) => {
            const inMonth = iso.slice(0, 7) === month.slice(0, 7);
            const isSelected = iso === selected;
            const isToday = iso === today;
            const info = dayInfo(iso);
            return (
              <button
                key={iso}
                data-date={iso}
                onClick={() => {
                  onSelect(iso);
                  if (!inMonth) onMonthChange(monthStart(iso));
                }}
                className={`relative flex aspect-square flex-col items-start justify-between rounded-lg border p-1.5 text-left transition md:aspect-auto md:h-[76px] ${
                  isSelected
                    ? "border-violet-bright bg-violet text-white"
                    : inMonth
                      ? "border-line bg-surface text-ink hover:bg-line/30"
                      : "border-line bg-surface text-ink-muted/60 hover:bg-line/30"
                }`}
              >
                <span
                  className={`text-[11px] leading-none ${
                    isToday
                      ? `font-bold underline decoration-2 underline-offset-2 ${
                          isSelected ? "decoration-white" : "decoration-ink"
                        }`
                      : "font-medium"
                  }`}
                >
                  {Number(iso.slice(8))}
                </span>
                <span className="flex items-center gap-1">
                  {info?.label && (
                    <span
                      className={`text-xs font-semibold leading-none ${
                        isSelected ? "text-white" : "text-ink"
                      }`}
                    >
                      {info.label}
                    </span>
                  )}
                  {info?.open && (
                    <span
                      className={`tick-live ${isSelected ? "!bg-white" : ""}`}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
