import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import {
  isAuthorizedAdminUser,
  sanitizeAdminRedirectPath,
} from "@/lib/admin-auth-check";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const ADMIN_BASE_PATH = "/admin";
const ADMIN_LOGIN_PATH = "/admin/login";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute =
    pathname === ADMIN_BASE_PATH || pathname.startsWith(`${ADMIN_BASE_PATH}/`);
  const isLoginRoute = pathname === ADMIN_LOGIN_PATH;

  if (!isAdminRoute) {
    return NextResponse.next({ request });
  }

  const env = getSupabasePublicEnv();

  if (!env) {
    if (isAdminRoute && !isLoginRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Importante: não adicionar lógica antes de `auth.getUser()` para evitar
  // dessincronização dos cookies de sessão do Supabase SSR.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminRoute && !isLoginRoute) {
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set("next", sanitizeAdminRedirectPath(pathname));
      return NextResponse.redirect(loginUrl);
    }

    const isAdmin = await isAuthorizedAdminUser(
      supabase as unknown as SupabaseClient<Database>,
      user,
    );

    if (!isAdmin) {
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = ADMIN_LOGIN_PATH;
      loginUrl.searchParams.set("error", "unauthorized");
      loginUrl.searchParams.delete("next");

      const redirectResponse = NextResponse.redirect(loginUrl);
      for (const cookie of supabaseResponse.cookies.getAll()) {
        redirectResponse.cookies.set(cookie);
      }
      return redirectResponse;
    }
  }

  if (isLoginRoute && user) {
    const isAdmin = await isAuthorizedAdminUser(
      supabase as unknown as SupabaseClient<Database>,
      user,
    );

    if (isAdmin) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = ADMIN_BASE_PATH;
      adminUrl.searchParams.delete("next");
      adminUrl.searchParams.delete("error");
      return NextResponse.redirect(adminUrl);
    }
  }

  return supabaseResponse;
}
