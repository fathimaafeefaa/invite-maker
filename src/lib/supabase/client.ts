import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

/** Browser client: signing in and uploading photos. */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
