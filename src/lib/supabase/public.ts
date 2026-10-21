import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "./env";

/** Anonymous client with no session: used for guest pages (anon role only). */
export function createPublicClient() {
  const { url, key } = supabaseEnv();
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
