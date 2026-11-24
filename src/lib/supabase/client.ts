import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { requireSupabasePublicEnv } from "@/lib/supabase/env";

export function createClient(): SupabaseClient<Database> {
  const { url, anonKey } = requireSupabasePublicEnv();

  return createBrowserClient<Database>(
    url,
    anonKey,
  ) as unknown as SupabaseClient<Database>;
}
