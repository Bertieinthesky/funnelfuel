import { createClient } from "@supabase/supabase-js";

// Server-side client — uses the service role key (full DB access, bypasses RLS)
// Only use in API routes and server components, never expose to the browser
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error("Missing Supabase server environment variables");
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Browser-safe client — uses the anon key (respects RLS)
// Used in client components for realtime subscriptions and auth
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!url || !key) {
    throw new Error("Missing Supabase public environment variables");
  }

  return createClient(url, key);
}
