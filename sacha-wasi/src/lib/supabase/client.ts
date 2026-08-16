import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig, isSupabaseConfigured } from "./config";

export function createClient() {
  if (!isSupabaseConfigured) return null;

  const { url, publishableKey } = getSupabaseConfig();
  return createBrowserClient(url, publishableKey);
}
