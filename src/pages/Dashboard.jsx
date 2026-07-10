import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  addDays,
  addMonths,
  fmtDay,
  fmtMonth,
  fmtWeekRange,
  maxISO,
  minISO,
  monthEnd,
  monthStart,
  todayISO,
  weekStart,
} from "../lib/dates";
import { totals } from "../lib/calc";
import { useEntries, useRates } from "../lib/data";
import { PARTNER_LABEL, useView } from "../lib/view";
import PeriodCard from "../components/PeriodCard";

export default function Dashboard() {
  const { isViewingOther } = useView();
  const today = todayISO();
  const [day, setDay] = useState(today);
  const [week, setWeek] = useState(weekStart(today)); // always a Monday
  const [month, setMonth] = useState(monthStart(today)); // always the 1st

  // One query covering all three browsed periods; totals are then computed
  // live per period from the raw rows on every render.
  const from = minISO(day, week, month);
  const to = maxISO(day, addDays(week, 6), monthEnd(month));
  const { entries } = useEntries(from, to);
  const { rates } = useRates();

  const loading = entries === null || rates === null;

  // The count-up plays once, when the first data lands. Browsing periods
  // or switching whose hours are shown updates numbers instantly.
  const playedCountUp = useRef(false);
  const countUp = !playedCountUp.current;
  useEffect(() => {
    if (!loading) playedCountUp.current = true;
  }, [loading]);

  const [dayTotals, weekTotals, monthTotals] = useMemo(() => {
    if (loading) return [null, null, null];
    const weekEndISO = addDays(week, 6);
    const monthEndISO = monthEnd(month);
    return [
      totals(entries.filter((e) => e.work_date === day), rates),
      totals(
        entries.filter((e) => e.work_date >= week && e.work_date <= weekEndISO),
        rates
      ),
      totals(
        entries.filter(
          (e) => e.work_date >= month && e.work_date <= monthEndISO
        ),
        rates
      ),
    ];
  }, [loading, entries, rates, day, week, month]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b-2 border-ink pb-2">
        <h1 className="font-display text-xl font-bold uppercase tracking-wider text-ink">
          {isViewingOther ? `${PARTNER_LABEL}’s hours` : "Timesheet"}
        </h1>
        {!isViewingOther && (
          <Link
            to={`/calendar?date=${today}`}
            data-press
            className="inline-block bg-accent px-3.5 py-2 text-xs font-bold uppercase tracking-widest text-paper transition hover:bg-accent/90"
          >
            + Log time
          </Link>
        )}
      </div>

      <PeriodCard
        title="Day"
        sublabel={day === today ? `Today · ${fmtDay(day)}` : fmtDay(day)}
        totals={dayTotals}
        loading={loading}
        countUpDelay={countUp ? 0 : null}
        isCurrent={day === today}
        onPrev={() => setDay(addDays(day, -1))}
        onNext={() => setDay(addDays(day, 1))}
        onReset={() => setDay(today)}
      />

      <PeriodCard
        title="Week · Mon–Sun"
        sublabel={
          week === weekStart(today)
            ? `This week · ${fmtWeekRange(week)}`
            : fmtWeekRange(week)
        }
        totals={weekTotals}
        loading={loading}
        countUpDelay={countUp ? 0.08 : null}
        isCurrent={week === weekStart(today)}
        onPrev={() => setWeek(addDays(week, -7))}
        onNext={() => setWeek(addDays(week, 7))}
        onReset={() => setWeek(weekStart(today))}
      />

      <PeriodCard
        title="Month"
        sublabel={
          month === monthStart(today)
            ? `This month · ${fmtMonth(month)}`
            : fmtMonth(month)
        }
        totals={monthTotals}
        loading={loading}
        countUpDelay={countUp ? 0.16 : null}
        isCurrent={month === monthStart(today)}
        onPrev={() => setMonth(addMonths(month, -1))}
        onNext={() => setMonth(addMonths(month, 1))}
        onReset={() => setMonth(monthStart(today))}
      />
    </div>
  );
}
