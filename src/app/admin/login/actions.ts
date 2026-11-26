"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import {
  isAuthorizedAdminUser,
  sanitizeAdminRedirectPath,
} from "@/lib/admin-auth-check";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getSupabasePublicEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(160),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres.")
    .max(128, "Senha inválida."),
  next: z.string().max(200).optional(),
});

export interface LoginFormState {
  error?: string;
}

export async function signInAdmin(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  if (!getSupabasePublicEnv()) {
    return {
      error:
        "Serviço de autenticação temporariamente indisponível. Tente novamente mais tarde.",
    };
  }

  const clientIp = await getClientIp();
  const ipRateLimit = await checkRateLimit({
    namespace: "admin-login-ip",
    identifier: clientIp,
    limit: 10,
    windowSeconds: 15 * 60,
  });

  if (!ipRateLimit.allowed) {
    return {
      error:
        "Muitas tentativas de login em sequência. Aguarde alguns minutos e tente novamente.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    next: formData.get("next")?.toString() ?? undefined,
  });

  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Verifique seu e-mail e senha.";
    return { error: firstError };
  }

  const emailRateLimit = await checkRateLimit({
    namespace: "admin-login-email",
    identifier: parsed.data.email,
    limit: 8,
    windowSeconds: 15 * 60,
  });

  if (!emailRateLimit.allowed) {
    return {
      error:
        "Muitas tentativas de login para esta conta. Aguarde alguns minutos e tente novamente.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      error:
        "E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.",
    };
  }

  const isAdmin = await isAuthorizedAdminUser(supabase, data.user);
  if (!isAdmin) {
    await supabase.auth.signOut();
    return {
      error: "Esta conta não possui permissão para acessar o painel administrativo.",
    };
  }

  redirect(sanitizeAdminRedirectPath(parsed.data.next));
}

export async function signOutAdmin() {
  if (getSupabasePublicEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
