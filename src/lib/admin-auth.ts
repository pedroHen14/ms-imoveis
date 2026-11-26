import { cache } from "react";
import { redirect } from "next/navigation";
import { isAuthorizedAdminUser } from "@/lib/admin-auth-check";
import { createClient } from "@/lib/supabase/server";

/**
 * Memoiza a verificação de sessão administrativa por requisição RSC, evitando
 * chamadas redundantes a `auth.getUser()` e `is_admin()` entre Layout e Page.
 */
const getCachedAdminSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { status: "unauthenticated" as const };
  }

  const isAdmin = await isAuthorizedAdminUser(supabase, user);
  if (!isAdmin) {
    return { status: "unauthorized" as const };
  }

  return { status: "authorized" as const, supabase, user };
});

export async function requireAdminUser() {
  const session = await getCachedAdminSession();

  if (session.status === "unauthenticated") {
    redirect("/admin/login");
  }

  if (session.status === "unauthorized") {
    redirect("/admin/login?error=unauthorized");
  }

  return { supabase: session.supabase, user: session.user };
}

export async function getAdminUserForAction() {
  const session = await getCachedAdminSession();

  if (session.status !== "authorized") {
    return null;
  }

  return { supabase: session.supabase, user: session.user };
}
