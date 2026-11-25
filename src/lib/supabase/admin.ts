import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface SupabaseAdminEnv {
  url: string;
  serviceRoleKey: string;
}

export function getSupabaseAdminEnv(): SupabaseAdminEnv | null {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!rawUrl || !serviceRoleKey) {
    return null;
  }

  const url = rawUrl.replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");

  return { url, serviceRoleKey };
}

/**
 * Cliente Supabase privilegiado (service_role) para uso EXCLUSIVO no servidor
 * (Route Handlers protegidos, Cron jobs e chamadas RPC com SECURITY DEFINER).
 * Nunca importe este módulo em Client Components.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  const env = getSupabaseAdminEnv();
  if (!env) {
    return null;
  }

  return createSupabaseClient<Database>(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
