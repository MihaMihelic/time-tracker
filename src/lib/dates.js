// All dates are handled as local-time "YYYY-MM-DD" strings to avoid
// timezone drift from Date <-> ISO string round trips.

export const pad2 = (n) => String(n).padStart(2, "0");

export const toISO = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const fromISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const todayISO = () => toISO(new Date());

export const addDays = (iso, n) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const addMonths = (iso, n) => {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + n, 1));
};

// ISO week: Monday is day 0, Sunday day 6.
export const weekStart = (iso) => {
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toISO(d);
};

export const monthStart = (iso) => iso.slice(0, 8) + "01";

export const monthEnd = (iso) => {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};

export const minISO = (...xs) => xs.reduce((a, b) => (a < b ? a : b));
export const maxISO = (...xs) => xs.reduce((a, b) => (a > b ? a : b));

// ---------- display formatting ----------

export const fmtDay = (iso) =>
  fromISO(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

export const fmtDayLong = (iso) =>
  fromISO(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export const fmtMonth = (iso) =>
  fromISO(iso).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export const fmtWeekRange = (mondayISO) => {
  const a = fromISO(mondayISO);
  const b = fromISO(addDays(mondayISO, 6));
  const opts = { month: "short", day: "numeric" };
  const left = a.toLocaleDateString(undefined, opts);
  const right = b.toLocaleDateString(undefined, {
    ...opts,
    year: "numeric",
  });
  return `${left} – ${right}`;
};

// "14:30:00" or "14:30" -> "14:30"
export const fmtTime = (t) => (t ? t.slice(0, 5) : "");
