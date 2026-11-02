import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig, getSupabaseConfigErrorMessage } from "./config";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  const config = getSupabaseConfig();

  if (!config) throw new Error(getSupabaseConfigErrorMessage());

  if (!supabaseClient) {
    supabaseClient = createBrowserClient(config.url, config.publishableKey);
  }

  return supabaseClient;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}
