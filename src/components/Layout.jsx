import { NavLink, Outlet, useLocation } from "react-router-dom";
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
// buddy who granted access. Only rendered when a grant exists.
function ViewToggle() {
  const { canViewPartner, isViewingOther, viewPartner, viewSelf } = useView();
  if (!canViewPartner) return null;

  const btn = (active) =>
    `rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
      active ? "btn-glow bg-violet text-white" : "text-ink-muted hover:text-ink"
    }`;

  return (
    <div className="border-b border-line bg-paper">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
        <div className="inline-flex gap-1 rounded-full border border-line bg-surface p-1 shadow-card">
          <button data-press className={btn(!isViewingOther)} onClick={viewSelf}>
            My hours
          </button>
          <button data-press className={btn(isViewingOther)} onClick={viewPartner}>
            {PARTNER_LABEL}&rsquo;s hours
          </button>
        </div>
        {isViewingOther && (
          <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            Read-only
          </span>
        )}
      </div>
    </div>
  );
}

export default function Layout() {
  const signOut = () => supabase.auth.signOut();

  // Dashboard and Calendar run the dark violet theme; Rates stays light.
  // The token remap in .theme-dark restyles everything inside, and
  // .theme-anim eases the colors when the route (and theme) changes.
  const { pathname } = useLocation();
  const dark = pathname === "/" || pathname.startsWith("/calendar");

  return (
    <div
      className={`theme-anim isolate min-h-screen bg-paper pb-20 text-ink md:pb-8 ${
        dark ? "theme-dark" : ""
      }`}
    >
      {/* Dark-view backdrop: near-black edges easing to deep violet at
          the center. Gradients can't color-transition, so it cross-fades
          via opacity over the wrapper's (transitioning) base color. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 50% 30%, #1a0b2e 0%, #0a0510 100%)",
          opacity: dark ? 1 : 0,
          transition: "opacity 220ms ease",
        }}
      />
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <span className="text-base font-bold tracking-tight text-ink">
            TimeTrack
          </span>

          <nav className="hidden items-center gap-1 md:flex">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === "/"}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "btn-glow bg-violet text-white"
                      : "text-ink-muted hover:text-ink"
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
            className="text-xs font-semibold text-ink-muted transition hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </header>

      <ViewToggle />

      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface md:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === "/"}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition ${
                  isActive ? "text-violet" : "text-ink-muted"
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
