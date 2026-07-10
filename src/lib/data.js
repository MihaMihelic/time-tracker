import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useView } from "./view";

// Fetch time entries in an inclusive work_date range for whichever user is
// currently being viewed (self, or an owner who granted read-only access).
// The explicit user_id filter matters: the shared-visibility RLS policy
// makes BOTH users' rows selectable, so without it the two accounts'
// entries would blend together. `refresh()` refetches after any mutation
// so every total on screen is recomputed from fresh rows — nothing cached.
export function useEntries(fromDate, toDate) {
  const { viewedUserId } = useView();
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  // Show a loading state when the range or viewed user changes, but NOT on
  // refresh() — keeping stale rows mounted during a refetch lets the UI
  // (e.g. the shift-close animation) transition in place.
  useEffect(() => {
    setEntries(null);
  }, [fromDate, toDate, viewedUserId]);

  useEffect(() => {
    let active = true;
    supabase
      .from("time_entries")
      .select("*")
      .eq("user_id", viewedUserId)
      .gte("work_date", fromDate)
      .lte("work_date", toDate)
      .order("work_date", { ascending: true })
      .order("start_time", { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else setEntries(data);
      });
    return () => {
      active = false;
    };
  }, [fromDate, toDate, viewedUserId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { entries, error, refresh };
}

// Full rate history for the viewed user (small table, fetched whole).
// Soft-deleted rows are included on purpose: historical entries still
// price against them (see rateFor in calc.js).
export function useRates() {
  const { viewedUserId } = useView();
  const [rates, setRates] = useState(null);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    setRates(null);
  }, [viewedUserId]);

  useEffect(() => {
    let active = true;
    supabase
      .from("rate_history")
      .select("*")
      .eq("user_id", viewedUserId)
      .order("effective_from", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message);
        else setRates(data);
      });
    return () => {
      active = false;
    };
  }, [viewedUserId, version]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  return { rates, error, refresh };
}
