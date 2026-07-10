import { useState } from "react";
import { supabase } from "../lib/supabase";

const inputCls =
  "mt-1 w-full border border-line bg-paper px-3 py-2 text-sm text-ink outline-none transition focus:border-steel";

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
          <h1 className="font-display text-2xl font-bold uppercase tracking-[0.25em] text-steel">
            TimeTrack
          </h1>
          <p className="mt-1 text-sm text-steel">
            Track your hours. Know your pay.
          </p>
        </div>

        <form onSubmit={submit} className="border border-line bg-sheet">
          <div className="ticks border-b border-line" />
          <div className="p-6">
            <label className="block text-xs font-medium text-ink/80">
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

            <label className="mt-4 block text-xs font-medium text-ink/80">
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
              <p className="mt-3 border border-rust/40 bg-paper px-3 py-2 text-xs text-rust">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-5 w-full bg-rust py-2.5 text-xs font-bold uppercase tracking-widest text-paper transition hover:bg-rust/90 disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <p className="mt-4 text-center text-xs text-steel">
              Private app — accounts are created by the administrator.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
