import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig, getSupabaseConfigErrorMessage } from "./config";

export async function createSupabaseServerClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error(getSupabaseConfigErrorMessage());

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
