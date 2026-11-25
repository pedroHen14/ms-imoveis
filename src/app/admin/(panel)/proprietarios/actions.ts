"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUserForAction } from "@/lib/admin-auth";

const ownerSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do proprietário.")
    .max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .max(30, "Telefone muito longo.")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(1000, "As observações podem ter no máximo 1.000 caracteres.")
    .optional()
    .or(z.literal("")),
});

export interface OwnerActionResult {
  ok: boolean;
  message?: string;
}

export async function saveOwner(
  formData: FormData,
): Promise<OwnerActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const parsed = ownerSchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    notes: formData.get("notes")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { id, name, phone, notes } = parsed.data;
  const payload = {
    name,
    phone: phone || null,
    notes: notes || null,
  };

  if (id) {
    const { error } = await auth.supabase
      .from("owners")
      .update(payload)
      .eq("id", id);

    if (error) {
      return {
        ok: false,
        message: "Não foi possível atualizar o proprietário.",
      };
    }
  } else {
    const { error } = await auth.supabase.from("owners").insert(payload);

    if (error) {
      return {
        ok: false,
        message: "Não foi possível cadastrar o proprietário.",
      };
    }
  }

  revalidatePath("/admin/proprietarios");
  revalidatePath("/admin/imoveis");
  revalidatePath("/admin");

  return {
    ok: true,
    message: id
      ? "Proprietário atualizado com sucesso."
      : "Proprietário cadastrado com sucesso.",
  };
}

export async function deleteOwner(id: string): Promise<OwnerActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Identificador inválido." };
  }

  const { error } = await auth.supabase
    .from("owners")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    return {
      ok: false,
      message: "Não foi possível excluir o proprietário.",
    };
  }

  revalidatePath("/admin/proprietarios");
  revalidatePath("/admin/imoveis");
  revalidatePath("/admin");

  return { ok: true, message: "Proprietário excluído." };
}
