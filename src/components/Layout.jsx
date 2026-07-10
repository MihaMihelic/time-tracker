import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { PARTNER_LABEL, useView } from "../lib/view";

const tabs = [
  {
    to: "/",
    label: "Dashboard",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 12 12 4.5l8.25 7.5M5.25 10.5V19.5h4.5v-4.5h4.5v4.5h4.5v-9"
      />
    ),
  },
  {
    to: "/calendar",
    label: "Calendar",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3.75 8.25h16.5M4.5 5.25h15a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75V6a.75.75 0 0 1 .75-.75Z"
      />
    ),
  },
  {
    to: "/rates",
    label: "Rates",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m3.75-9.75c0-1.243-1.679-2.25-3.75-2.25S8.25 7.007 8.25 8.25c0 1.242 1.679 2.25 3.75 2.25s3.75 1.007 3.75 2.25-1.679 2.25-3.75 2.25-3.75-1.008-3.75-2.25"
      />
    ),
  },
];

function TabIcon({ children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      className="h-5 w-5"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Segmented switch between my own data and the read-only view of the
// partner who granted access. Only rendered when a grant exists.
function ViewToggle() {
  const { canViewPartner, isViewingOther, viewPartner, viewSelf } = useView();
  if (!canViewPartner) return null;

  const btn = (active) =>
    `px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest transition ${
      active ? "bg-accent text-paper" : "text-steel hover:bg-sheet"
    }`;

  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2">
        <div className="inline-flex divide-x divide-line border border-line">
          <button data-press className={btn(!isViewingOther)} onClick={viewSelf}>
            My hours
          </button>
          <button data-press className={btn(isViewingOther)} onClick={viewPartner}>
            {PARTNER_LABEL}&rsquo;s hours
          </button>
        </div>
        {isViewingOther && (
          <span className="text-[11px] font-medium uppercase tracking-widest text-steel">
            Read-only
          </span>
        )}
      </div>
    </div>
  );
}

export default function Layout() {
  const signOut = () => supabase.auth.signOut();

  return (
    <div className="min-h-screen bg-paper pb-20 text-ink md:pb-8">
      <header className="sticky top-0 z-20 bg-steel text-paper">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="font-display text-base font-bold uppercase tracking-[0.25em]">
            TimeTrack
          </span>

          <nav className="hidden items-center gap-5 md:flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) =>
                  `border-b-2 pb-0.5 text-xs font-semibold uppercase tracking-widest transition ${
                    isActive
                      ? "border-paper text-paper"
                      : "border-transparent text-paper/60 hover:text-paper"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={signOut}
            data-press
            className="text-xs font-medium uppercase tracking-widest text-paper/60 transition hover:text-paper"
          >
            Sign out
          </button>
        </div>
        <div className="ticks bg-paper" />
      </header>

      <ViewToggle />

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-sheet md:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition ${
                  isActive ? "text-accent" : "text-steel/70"
                }`
              }
            >
              <TabIcon>{t.icon}</TabIcon>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
