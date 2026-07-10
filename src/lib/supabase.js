import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = Boolean(url && anonKey);

// Fall back to harmless placeholders so the app can render a friendly
// "not configured" screen instead of crashing when env vars are missing.
export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  anonKey || "placeholder"
);
