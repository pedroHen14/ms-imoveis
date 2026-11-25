"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminUserForAction } from "@/lib/admin-auth";
import type { LeadStatus } from "@/types/database";

const LEAD_SOURCES = [
  "site",
  "whatsapp",
  "indicacao",
  "newcore",
  "olx",
  "marketplace",
] as const;

const LEAD_STATUSES = [
  "novo",
  "em_contato",
  "visita",
  "proposta",
  "fechado",
  "perdido",
] as const;

const leadSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do interessado.")
    .max(120, "Nome muito longo."),
  phone: z
    .string()
    .trim()
    .min(8, "Informe um telefone/WhatsApp válido.")
    .max(30, "Telefone muito longo."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .max(160)
    .optional()
    .or(z.literal("")),
  source: z.enum(LEAD_SOURCES),
  status: z.enum(LEAD_STATUSES),
  property_id: z.string().uuid().nullable(),
  notes: z
    .string()
    .trim()
    .max(2000, "As observações podem ter no máximo 2.000 caracteres.")
    .optional()
    .or(z.literal("")),
});

export interface LeadActionResult {
  ok: boolean;
  message?: string;
  lastContactAt?: string;
}

function revalidateLeadPaths() {
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

export async function saveLead(
  formData: FormData,
): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada. Faça login novamente." };
  }

  const rawPropertyId = formData.get("property_id")?.toString().trim() ?? "";

  const parsed = leadSchema.safeParse({
    id: formData.get("id")?.toString() ?? "",
    name: formData.get("name")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    email: formData.get("email")?.toString() ?? "",
    source: formData.get("source")?.toString() ?? "indicacao",
    status: formData.get("status")?.toString() ?? "novo",
    property_id: rawPropertyId || null,
    notes: formData.get("notes")?.toString() ?? "",
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Revise os dados do lead.",
    };
  }

  const { id, name, phone, email, source, status, property_id, notes } =
    parsed.data;

  const payload = {
    name,
    phone,
    email: email || null,
    source,
    status,
    property_id,
    notes: notes || null,
  };

  if (id) {
    const { error } = await auth.supabase
      .from("leads")
      .update(payload)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar lead:", error.message);
      return { ok: false, message: "Não foi possível atualizar o lead." };
    }
  } else {
    const { error } = await auth.supabase.from("leads").insert({
      ...payload,
      last_contact_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Erro ao cadastrar lead:", error.message);
      return { ok: false, message: "Não foi possível cadastrar o lead." };
    }
  }

  revalidateLeadPaths();

  return {
    ok: true,
    message: id
      ? "Lead atualizado com sucesso."
      : "Lead cadastrado com sucesso.",
  };
}

export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  const parsedStatus = z.enum(LEAD_STATUSES).safeParse(status);

  if (!parsedId.success || !parsedStatus.success) {
    return { ok: false, message: "Dados inválidos." };
  }

  const { error } = await auth.supabase
    .from("leads")
    .update({ status: parsedStatus.data })
    .eq("id", parsedId.data);

  if (error) {
    return { ok: false, message: "Não foi possível atualizar o status." };
  }

  revalidateLeadPaths();
  return { ok: true };
}

export async function registerLeadWhatsAppContact(
  id: string,
): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Identificador inválido." };
  }

  const nowIso = new Date().toISOString();
  const { error } = await auth.supabase
    .from("leads")
    .update({ last_contact_at: nowIso })
    .eq("id", parsedId.data);

  if (error) {
    return {
      ok: false,
      message: "Não foi possível registrar o contato no WhatsApp.",
    };
  }

  revalidateLeadPaths();
  return {
    ok: true,
    lastContactAt: nowIso,
    message: "Último contato atualizado.",
  };
}

export async function deleteLead(id: string): Promise<LeadActionResult> {
  const auth = await getAdminUserForAction();
  if (!auth) {
    return { ok: false, message: "Sessão expirada." };
  }

  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) {
    return { ok: false, message: "Identificador inválido." };
  }

  const { error } = await auth.supabase
    .from("leads")
    .delete()
    .eq("id", parsedId.data);

  if (error) {
    return { ok: false, message: "Não foi possível excluir o lead." };
  }

  revalidateLeadPaths();
  return { ok: true, message: "Lead excluído." };
}
