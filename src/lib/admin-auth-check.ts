import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const SAFE_ADMIN_PATH_REGEX = /^\/admin(?:\/[a-zA-Z0-9_-]+)*$/;

export function sanitizeAdminRedirectPath(nextPath?: string | null): string {
  if (!nextPath) return "/admin";
  const trimmed = nextPath.trim();
  if (SAFE_ADMIN_PATH_REGEX.test(trimmed) && trimmed !== "/admin/login") {
    return trimmed;
  }
  return "/admin";
}

function getAllowedAdminEmails(): Set<string> | null {
  const raw = process.env.ADMIN_ALLOWED_EMAILS?.trim();
  if (!raw) return null;

  const emails = raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.includes("@"));

  return emails.length > 0 ? new Set(emails) : null;
}

/**
 * Verifica se o usuário autenticado possui autorização administrativa real:
 * 1) Se `ADMIN_ALLOWED_EMAILS` estiver definida, o e-mail precisa constar na lista;
 * 2) Deve possuir claim imutável `app_metadata.role === "admin"` OU retorno `true`
 *    da RPC `public.is_admin()` (tabela `public.admin_users`).
 *
 * NUNCA utiliza `user_metadata` (editável pelo próprio usuário).
 */
export async function isAuthorizedAdminUser(
  supabase: SupabaseClient<Database>,
  user: User,
): Promise<boolean> {
  const allowedEmails = getAllowedAdminEmails();
  if (allowedEmails) {
    const email = user.email?.trim().toLowerCase();
    if (!email || !allowedEmails.has(email)) {
      return false;
    }
  }

  if (user.app_metadata?.role === "admin") {
    return true;
  }

  try {
    const { data, error } = await supabase.rpc("is_admin");
    if (error) {
      console.error("[admin-auth] Falha ao consultar RPC is_admin:", error.message);
      return false;
    }
    return data === true;
  } catch {
    return false;
  }
}
