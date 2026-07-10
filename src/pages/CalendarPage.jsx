import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  addDays,
  maxISO,
  minISO,
  monthEnd,
  monthStart,
  todayISO,
  weekStart,
} from "../lib/dates";
import { useEntries, useRates } from "../lib/data";
import MonthCalendar from "../components/MonthCalendar";
import DayPanel from "../components/DayPanel";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function CalendarPage() {
  const [params, setParams] = useSearchParams();
  const paramDate = params.get("date");
  const initial = ISO_DATE.test(paramDate ?? "") ? paramDate : todayISO();

  const [selected, setSelectedState] = useState(initial);
  const [month, setMonth] = useState(monthStart(initial));

  const setSelected = (iso) => {
    setSelectedState(iso);
    setParams({ date: iso }, { replace: true });
  };

  // Fetch the whole visible grid (Mon before the 1st .. Sun after the last
  // day) so spill-over days from adjacent months show their entries too,
  // widened to include the selected date when browsing other months.
  const gridFrom = minISO(weekStart(monthStart(month)), selected);
  const gridTo = maxISO(addDays(weekStart(monthEnd(month)), 6), selected);
  const { entries, refresh } = useEntries(gridFrom, gridTo);
  const { rates } = useRates();

  const loading = entries === null || rates === null;

  const dayEntries = useMemo(
    () => (entries ?? []).filter((e) => e.work_date === selected),
    [entries, selected]
  );

  return (
    <div className="space-y-4">
      <h1 className="border-b-2 border-ink pb-2 font-display text-xl font-bold uppercase tracking-wider text-ink">
        Calendar
      </h1>

      <MonthCalendar
        month={month}
        selected={selected}
        entries={entries}
        onSelect={setSelected}
        onMonthChange={setMonth}
      />

      {loading ? (
        <div className="h-40 animate-pulse border border-line bg-sheet" />
      ) : (
        <DayPanel
          date={selected}
          entries={dayEntries}
          rates={rates}
          onChange={refresh}
        />
      )}
    </div>
  );
}
