"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getSupabasePublicEnv } from "@/lib/supabase/env";

const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
  next: z.string().optional(),
});

export interface LoginFormState {
  error?: string;
}

function getSafeRedirectPath(nextPath?: string): string {
  if (!nextPath) return "/admin";
  if (nextPath.startsWith("/admin") && !nextPath.startsWith("//")) {
    return nextPath;
  }
  return "/admin";
}

export async function signInAdmin(
  _prevState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  if (!getSupabasePublicEnv()) {
    return {
      error:
        "As variáveis do Supabase não estão configuradas no ambiente (.env.local).",
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: "E-mail ou senha inválidos. Verifique suas credenciais e tente novamente.",
    };
  }

  redirect(getSafeRedirectPath(parsed.data.next));
}

export async function signOutAdmin() {
  if (getSupabasePublicEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
