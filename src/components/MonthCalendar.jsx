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

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Month grid, Monday-first (matches the ISO week used for totals).
// Styled like a physical punch card: tick strips top and bottom, hairline
// rules between cells, stamped hour figures, a pulsing rust tick on days
// with a shift still on the clock.
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
    <div className="border border-line bg-sheet">
      <div className="ticks border-b border-line" />

      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-display text-base font-bold uppercase tracking-wider text-ink">
          {fmtMonth(month)}
        </h2>
        <div className="flex divide-x divide-line border border-line">
          <button
            onClick={() => onMonthChange(addMonths(month, -1))}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center text-steel transition hover:bg-paper"
          >
            ‹
          </button>
          <button
            onClick={() => {
              onMonthChange(monthStart(today));
              onSelect(today);
            }}
            className="px-2.5 text-[11px] font-semibold uppercase tracking-widest text-steel transition hover:bg-paper"
          >
            Today
          </button>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center text-steel transition hover:bg-paper"
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
              className="border-b border-ink pb-1 text-center text-[10px] font-semibold uppercase tracking-widest text-steel"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px border border-line bg-line">
          {days.map((iso) => {
            const inMonth = iso.slice(0, 7) === month.slice(0, 7);
            const isSelected = iso === selected;
            const isToday = iso === today;
            const info = dayInfo(iso);
            return (
              <button
                key={iso}
                onClick={() => {
                  onSelect(iso);
                  if (!inMonth) onMonthChange(monthStart(iso));
                }}
                className={`relative flex aspect-square flex-col items-start justify-between p-1.5 text-left transition ${
                  isSelected
                    ? "bg-steel text-paper"
                    : inMonth
                      ? "bg-sheet text-ink hover:bg-paper"
                      : "bg-sheet text-ink/30 hover:bg-paper"
                }`}
              >
                <span
                  className={`text-[11px] leading-none ${
                    isToday
                      ? `font-bold underline decoration-2 underline-offset-2 ${
                          isSelected ? "decoration-paper" : "decoration-ink"
                        }`
                      : "font-medium"
                  }`}
                >
                  {Number(iso.slice(8))}
                </span>
                <span className="flex items-center gap-1">
                  {info?.label && (
                    <span
                      className={`font-display text-[11px] font-semibold leading-none ${
                        isSelected ? "text-paper" : "text-ink"
                      }`}
                    >
                      {info.label}
                    </span>
                  )}
                  {info?.open && <span className="tick-live" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="ticks border-t border-line" />
    </div>
  );
}
