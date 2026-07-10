import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { isConfigured, supabase } from "./lib/supabase";
import { ViewProvider } from "./lib/view";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import RatesPage from "./pages/RatesPage";

function NotConfigured() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="max-w-md border border-line bg-sheet p-8">
        <h1 className="font-display text-lg font-semibold text-ink">
          Supabase is not configured
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-steel">
          Set <code className="bg-paper px-1">VITE_SUPABASE_URL</code> and{" "}
          <code className="bg-paper px-1">VITE_SUPABASE_ANON_KEY</code> in a{" "}
          <code className="bg-paper px-1">.env</code> file (or Vercel
          environment variables), then rebuild. See README.md.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  // undefined = still checking, null = signed out, object = signed in
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!isConfigured) return <NotConfigured />;

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <span className="tick-live" aria-label="Loading" />
      </div>
    );
  }

  if (!session) return <Login />;

  return (
    <ViewProvider userId={session.user.id}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/rates" element={<RatesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ViewProvider>
  );
}
