import { useState } from "react";
import { supabase } from "../lib/supabase";

const inputCls =
  "mt-1 w-full rounded-lg border-[1.5px] border-line bg-surface px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-violet";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setError(error.message);
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            TimeTrack
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            Track your hours. Know your pay.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-xl bg-surface p-6 shadow-card"
        >
          <label className="block text-xs font-medium text-ink">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </label>

          <label className="mt-4 block text-xs font-medium text-ink">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </label>

          {error && (
            <p className="mt-3 rounded-lg border-[1.5px] border-danger/40 bg-surface px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            data-press
            className="mt-5 w-full rounded-lg bg-violet py-2.5 text-sm font-semibold text-white transition hover:bg-violet/90 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-4 text-center text-xs text-ink-muted">
            Private app — accounts are created by the administrator.
          </p>
        </form>
      </div>
    </div>
  );
}
