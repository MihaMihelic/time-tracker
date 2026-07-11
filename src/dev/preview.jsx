// Dev-only design preview (npm run dev -> /preview.html).
// Renders the real components with static data so the visual direction
// and motion can be checked without a Supabase backend. Not part of the
// production build (vite only builds index.html).

import React from "react";
import ReactDOM from "react-dom/client";
import { ViewProvider } from "../lib/view";
import { initPressFeedback } from "../lib/motion";
import { addDays, monthStart, todayISO } from "../lib/dates";
import PeriodCard from "../components/PeriodCard";
import MonthCalendar from "../components/MonthCalendar";
import DayPanel from "../components/DayPanel";
import "../index.css";

initPressFeedback();

const today = todayISO();
const entry = (dayOffset, start_time, end_time) => ({
  id: `${dayOffset}-${start_time}`,
  work_date: addDays(today, dayOffset),
  start_time,
  end_time,
});

const rates = [
  { id: "r1", rate: 18.5, effective_from: "2026-01-01", is_deleted: false },
];

const monthEntries = [
  entry(-9, "06:30", "14:30"),
  entry(-8, "06:30", "15:00"),
  entry(-7, "07:00", "13:30"),
  entry(-5, "06:30", "14:30"),
  entry(-4, "06:30", "16:15"),
  entry(-2, "06:30", "14:30"),
  entry(-1, "08:00", "12:00"),
  entry(0, "06:30", "14:45"),
  entry(0, "15:30", null), // on the clock right now
];

const dayEntries = monthEntries.filter((e) => e.work_date === today);

const dayTotals = { minutes: 495, earnings: 152.63, openCount: 1, missingRate: false };
const weekTotals = { minutes: 2145, earnings: 661.38, openCount: 1, missingRate: false };
const monthTotals = { minutes: 8730, earnings: 2691.75, openCount: 1, missingRate: false };

const noop = () => {};

function Preview() {
  return (
    <ViewProvider userId="preview-user">
      <div className="theme-anim theme-dark isolate min-h-screen bg-paper pb-8 text-ink">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 85% 70% at 50% 30%, #1a0b2e 0%, #0a0510 100%)",
          }}
        />
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
            <span className="text-base font-bold tracking-tight text-ink">
              TimeTrack
            </span>
            <nav className="flex items-center gap-1">
              <span className="btn-glow rounded-full bg-violet px-3.5 py-1.5 text-xs font-semibold text-white">
                Dashboard
              </span>
              <span className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-muted">
                Calendar
              </span>
              <span className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-ink-muted">
                Rates
              </span>
            </nav>
            <span className="text-xs font-semibold text-ink-muted">
              Sign out
            </span>
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <div className="flex items-center justify-between pb-1">
            <h1 className="text-xl font-bold text-ink">Timesheet</h1>
            <button
              data-press
              className="btn-glow inline-block rounded-lg bg-violet px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-violet/90"
            >
              + Log time
            </button>
          </div>

          <PeriodCard
            title="Day"
            sublabel="Today · Fri, Jul 10"
            totals={dayTotals}
            loading={false}
            countUpDelay={0}
            isCurrent
            onPrev={noop}
            onNext={noop}
            onReset={noop}
          />
          <PeriodCard
            title="Week · Mon–Sun"
            sublabel="This week · Jul 6 – Jul 12, 2026"
            totals={weekTotals}
            loading={false}
            countUpDelay={0.08}
            isCurrent
            onPrev={noop}
            onNext={noop}
            onReset={noop}
          />
          <PeriodCard
            title="Month"
            sublabel="This month · July 2026"
            totals={monthTotals}
            loading={false}
            countUpDelay={0.16}
            isCurrent
            onPrev={noop}
            onNext={noop}
            onReset={noop}
          />

          <h1 className="pb-1 pt-4 text-xl font-bold text-ink">Calendar</h1>
          <MonthCalendar
            month={monthStart(today)}
            selected={today}
            entries={monthEntries}
            onSelect={noop}
            onMonthChange={noop}
          />
          <DayPanel date={today} entries={dayEntries} rates={rates} onChange={noop} />
        </main>
      </div>
    </ViewProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Preview />);
