import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Executa o middleware exclusivamente nas rotas administrativas (/admin).
     * A vitrine pública e os endpoints de cron não utilizam sessão Supabase Auth.
     */
    "/admin",
    "/admin/:path*",
  ],
};
