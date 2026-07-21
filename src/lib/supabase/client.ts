import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

export function createSupabaseBrowserClient() {
  if (typeof window === "undefined") {
    return null;
  }

  if (typeof browserClient !== "undefined") {
    return browserClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publicKey) {
    browserClient = null;
    return browserClient;
  }

  browserClient = createBrowserClient(url, publicKey);
  return browserClient;
}
